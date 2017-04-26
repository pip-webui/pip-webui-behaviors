{
    interface UnsavedChangesScope extends ng.IScope {
        unsavedChangesAvailable: Function;
        unsavedChangesMessage: string;
        cancelLeave: Function;
        afterLeave: Function;
    }

    class UnsavedChangesLink {
        constructor(
            $scope: UnsavedChangesScope,
            $window: ng.IWindowService
        ) {
            $window.onbeforeunload = () => {
                if ($scope.unsavedChangesAvailable()) {
                    return $scope.unsavedChangesMessage;
                }
            };

            const unbindFunc = $scope.$on('$stateChangeStart', (event) => {
                if ($scope.unsavedChangesAvailable() && !$window.confirm($scope.unsavedChangesMessage)) {
                    _.isFunction($scope.cancelLeave) && $scope.cancelLeave();
                    event.preventDefault();
                } else {
                    _.isFunction($scope.afterLeave) && $scope.afterLeave();
                }
            });

            $scope.$on('$destroy', () => {
                $window.onbeforeunload = null;
                unbindFunc();
            });
        }
    }

    const UnsavedChanges = function ($window: ng.IWindowService) {
        return {
            restrict: 'AE',
            scope: {
                unsavedChangesAvailable: '&pipUnsavedChangesAvailable',
                unsavedChangesMessage: '@pipUnsavedChangesMessage',
                afterLeave: '&pipUnsavedChangesAfterLeave',
                cancelLeave: '&pipUnsavedChangesCancelLeave'
            },
            link: function ($scope: UnsavedChangesScope) {
                new UnsavedChangesLink($scope, $window);
            }
        };
    }

    angular
        .module("pipUnsavedChanges", [])
        .directive("pipUnsavedChanges", UnsavedChanges);
}