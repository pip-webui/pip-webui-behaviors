import './unsaved_changes/unsavedChanges';
import './shortcuts/index';
import './focused/focused';
import './draggable/index';
import './selected/selected';
import './infinite_scroll/infiniteScroll';

angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);

export * from './shortcuts/index';
