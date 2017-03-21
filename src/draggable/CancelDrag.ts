{
    class CancelDragLink {
        constructor(
            $element: JQuery
        ) {
            $element.find('*').attr('pip-cancel-drag', 'pip-cancel-drag');
        }
    }

    const CancelDrag = function (): ng.IDirective {
        return {
            restrict: 'A',
            link: function (
                $scope: ng.IScope,
                $element: JQuery,
                $attrs: ng.IAttributes
            ) {
                new CancelDragLink($element);
            }
        }
    }

    angular.module("pipDraggable")
        .directive('pipCancelDrag', CancelDrag);
}