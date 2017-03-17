import './unsaved_changes/UnsavedChanges';
import './keyboard_shortcuts';
import './focused/Focused';

angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);