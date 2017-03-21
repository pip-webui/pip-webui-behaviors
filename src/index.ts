import './unsaved_changes/UnsavedChanges';
import './keyboard_shortcuts';
import './focused/Focused';
import './draggable';
import './selected/Selected';
import './focused/Focused';
import './infinite_scroll/InfiniteScroll';

angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);

export * from './keyboard_shortcuts';
export * from './draggable';