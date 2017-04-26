import './unsaved_changes/UnsavedChanges';
import './shortcuts/index';
import './focused/Focused';
import './draggable/index';
import './selected/Selected';
import './infinite_scroll/InfiniteScroll';

angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);

export * from './shortcuts/index';
