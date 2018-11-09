// @flow
import getPublisher from './publisher';
import type {
  State,
  DropResult,
  Handles,
  Critical,
  Announce,
} from '../../../types';
import type {
  Action,
  Middleware,
  MiddlewareStore,
  Dispatch,
} from '../../store-types';

export default (getHandles: () => Handles, announce: Announce): Middleware => {
  const publisher = getPublisher(
    (getHandles: () => Handles),
    (announce: Announce),
  );

  return (store: MiddlewareStore) => (next: Dispatch) => (
    action: Action,
  ): any => {
    if (action.type === 'INITIAL_PUBLISH') {
      const critical: Critical = action.payload.critical;
      publisher.beforeStart(critical, action.payload.movementMode);
      next(action);
      publisher.start(critical, action.payload.movementMode);
      return;
    }

    // Drag end
    if (action.type === 'DROP_COMPLETE') {
      const result: DropResult = action.payload;
      // flushing all pending handles before snapshots are updated
      publisher.flush();
      next(action);
      publisher.drop(result);
      return;
    }

    // All other handles can fire after we have updated our connected components
    next(action);

    // Drag state resetting - need to check if
    // we should fire a onDragEnd handle
    if (action.type === 'CLEAN') {
      publisher.abort();
      return;
    }

    // ## Perform drag updates
    // impact of action has already been reduced

    const state: State = store.getState();
    if (state.phase === 'DRAGGING') {
      publisher.update(state.critical, state.impact);
    }
  };
};