{

    class PreventDragLink {
        constructor(
            private $element: JQuery
        ) {
            this.initialize();
        }

        private initialize() {
            this.$element.attr('pip-draggable', 'false');
            this.toggleListeners(true);
        }

        private toggleListeners(enable) {
            // remove listeners
            if (!enable) return;
            // add listeners.
            this.$element.on('mousedown touchstart touchmove touchend touchcancel', (event) => { this.absorbEvent_(event); });
        }

        private absorbEvent_(event) {
            const e = event.originalEvent;
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            e.cancelBubble = true;
            e.returnValue = false;
            return false;
        }

    }

    const PreventDrag = function (): ng.IDirective {
        return {
            restrict: 'A',
            link: function (
                $scope: ng.IScope,
                $element: JQuery,
                $attrs: ng.IAttributes
            ) {
                new PreventDragLink($element);
            }
        }
    }

    angular.module("pipDraggable")
        .directive('pipPreventDrag', PreventDrag);
}