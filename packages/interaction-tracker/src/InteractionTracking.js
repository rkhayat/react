/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import invariant from 'shared/invariant';

import {
  getCurrentContext as getCurrentContextZone,
  track as trackZone,
  wrap as wrapZone,
} from './InteractionZone';

// TODO This package will likely want to override browser APIs (e.g. setTimeout, fetch)
// So that async callbacks are automatically wrapped with the current tracked event info.
// For the initial iteration, async callbacks must be explicitely wrapped with wrap().

export type AddedInteractionContext = {|
  eventName: string,
  nextContext: AddedInteractionContext | null,
  timestamp: number,
|};

export type InteractionEvent = {|
  eventName: string,
  firstContext: AddedInteractionContext | null,
  lastContext: AddedInteractionContext | null,
  timestamp: number,
|};

// Normally we would use the current renderer HostConfig's "now" method,
// But since interaction-tracking will be a separate package,
// I instead just copied the approach used by ReactScheduler.
let now;
if (typeof performance === 'object' && typeof performance.now === 'function') {
  const Performance = performance;
  now = function() {
    return Performance.now();
  };
} else {
  const localDate = Date;
  now = function() {
    return localDate.now();
  };
}

export function track(eventName: string, callback: Function): void {
  if (!__PROFILE__) {
    callback();
    return;
  }

  const context: InteractionEvent = {
    eventName,
    firstContext: null,
    lastContext: null,
    timestamp: now(),
  };

  trackZone(context, callback);
}

export function addContext(eventName: string): void {
  if (!__PROFILE__) {
    return;
  }

  const context = ((getCurrentContextZone(): any): InteractionEvent);

  if (__DEV__) {
    invariant(
      context !== null,
      'Context cannot be added outside of a tracked event.',
    );
  }

  const markedEvent: AddedInteractionContext = {
    eventName,
    nextContext: null,
    timestamp: now(),
  };
  if (context.lastContext !== null) {
    context.lastContext.nextContext = markedEvent;
    context.lastContext = markedEvent;
  } else {
    context.firstContext = context.lastContext = markedEvent;
  }
}

export function wrap(callback: Function): Function {
  if (!__PROFILE__) {
    return callback;
  }

  return wrapZone(callback);
}

export function getCurrentEvent(): InteractionEvent | null {
  if (!__PROFILE__) {
    return null;
  } else {
    return getCurrentContextZone();
  }
}
