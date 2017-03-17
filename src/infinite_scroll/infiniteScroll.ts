{

    interface InfiniteScrollScope extends ng.IScope {
        pipInfiniteScroll: Function;
        pipScrollContainer: JQuery;
        pipScrollDistance: number | string;
        pipScrollDisabled: boolean;
        pipScrollUseDocumentBottom: boolean;
        pipScrollListenForEvent: string;
    }

    interface InfiniteScrollAttributes extends ng.IAttributes {
        pipScrollParent: any;
        pipScrolImmediateCheck: any;
    }

    class InfiniteScrollLink {
        private THROTTLE_MILLISECONDS: number = 500;
        private checkWhenEnabled = null;
        private scrollContainer = null;
        private immediateCheck = true;
        private scrollDistance = null;
        private scrollEnabled = null;
        private unregisterEventListener = null;
        private useDocumentBottom = false;
        private windowElement = null;
        private onContainerScrollThrottle: Function;

        constructor(
            private $rootScope: ng.IRootScopeService,
            private $window: ng.IWindowService,
            private $interval: ng.IIntervalService,
            private $scope: InfiniteScrollScope,
            private $element: JQuery,
            private $attrs: InfiniteScrollAttributes
        ) {
            this.windowElement = angular.element($window);

            this.onContainerScrollThrottle = _.throttle(() => {
                this.onContainerScroll();
            }, this.THROTTLE_MILLISECONDS);

            $scope.$on('$destroy', () => {
                this.scrollContainer.unbind('scroll', () => {
                    this.onContainerScrollThrottle();
                });
                if (this.unregisterEventListener !== null) {
                    this.unregisterEventListener();
                    return this.unregisterEventListener = null;
                }
            });

            $scope.$watch('pipScrollDistance', (v) => {
                this.handleScrollDistance(v);
            });
            this.handleScrollDistance($scope.pipScrollDistance);

            $scope.$watch('pipScrollDisabled', (v) => {
                this.handleScrollDisabled(v);
            });
            this.handleScrollDisabled($scope.pipScrollDisabled);

            $scope.$watch('pipScrollUseDocumentBottom', (v) => {
                this.handleScrollUseDocumentBottom(v);
            });
            this.handleScrollUseDocumentBottom($scope.pipScrollUseDocumentBottom);

            this.changeContainer(this.windowElement);
            if ($scope.pipScrollListenForEvent) {
                this.unregisterEventListener = $rootScope.$on($scope.pipScrollListenForEvent, () => {
                    this.onContainerScrollThrottle();
                });
            }

            $scope.$watch('pipScrollContainer', (newContainer) => {
                if (newContainer != this.scrollContainer)
                    this.handleScrollContainer(newContainer);
            });
            this.handleScrollContainer($scope.pipScrollContainer || []);

            if ($attrs.pipScrollParent !== null) {
                this.changeContainer(angular.element($element.parent()));
            }
            if ($attrs.pipScrolImmediateCheck !== null) {
                this.immediateCheck = $scope.$eval($attrs.pipScrolImmediateCheck);
            }

            $interval((function () {
                if (this.immediateCheck) {
                    return this.onContainerScrollThrottle();
                }
            }), 0, 1);
        }

        private height(element) {
            element = element[0] || element;
            if (isNaN(element.offsetHeight)) {
                return element.document.documentElement.clientHeight;
            } else {
                return element.offsetHeight;
            }
        }

        private offsetTop(element) {
            if (!element[0].getBoundingClientRect || element.css('none')) {
                return;
            }
            return element[0].getBoundingClientRect().top + this.pageYOffset(element);
        }

        private pageYOffset(element) {
            element = element[0] || element;
            if (isNaN(window.pageYOffset)) {
                return element.document.documentElement.scrollTop;
            } else {
                return element.ownerDocument.defaultView.pageYOffset;
            }
        }

        private onContainerScroll() {
            let containerBottom,
                containerTopOffset,
                elementBottom,
                remaining,
                shouldScroll;

            if (this.scrollContainer === this.windowElement) {
                containerBottom = this.height(this.scrollContainer) + this.pageYOffset(this.scrollContainer[0].document.documentElement);
                elementBottom = this.offsetTop(this.$element) + this.height(this.$element);
            } else {
                containerBottom = this.height(this.scrollContainer);
                containerTopOffset = 0;
                if (this.offsetTop(this.scrollContainer) !== void 0) {
                    containerTopOffset = this.offsetTop(this.scrollContainer);
                }
                elementBottom = this.offsetTop(this.$element) - containerTopOffset + this.height(this.$element);
            }

            if (this.useDocumentBottom) {
                elementBottom = this.height((this.$element[0].ownerDocument || ( < any > this.$element[0]).document).documentElement);
            }

            remaining = elementBottom - containerBottom;
            shouldScroll = remaining <= this.height(this.scrollContainer) * this.scrollDistance + 1;

            if (shouldScroll) {
                this.checkWhenEnabled = true;
                if (this.scrollEnabled) {
                    if (this.$scope.$$phase || this.$rootScope.$$phase) {
                        return this.$scope.pipInfiniteScroll();
                    } else {
                        return this.$scope.$apply(() => {
                            this.$scope.pipInfiniteScroll();
                        });
                    }
                }
            } else {
                return this.checkWhenEnabled = false;
            }
        }

        private handleScrollDistance(v) {
            return this.scrollDistance = parseFloat(v) || 0;
        }

        private handleScrollDisabled(v) {
            this.scrollEnabled = !v;
            if (this.scrollEnabled && this.checkWhenEnabled) {
                this.checkWhenEnabled = false;
                this.onContainerScrollThrottle();
            }
        }

        private handleScrollUseDocumentBottom(v) {
            return this.useDocumentBottom = v;
        }

        private changeContainer(newContainer) {
            if (this.scrollContainer) {
                this.scrollContainer.unbind('scroll', () => {
                    this.onContainerScrollThrottle();
                });
            }

            this.scrollContainer = newContainer;
            if (newContainer) {
                return this.scrollContainer.bind('scroll', () => {
                    this.onContainerScrollThrottle();
                });
            }
        }

        private handleScrollContainer(newContainer) {
            if ((newContainer == null) || newContainer.length === 0) {
                return;
            }
            if (newContainer instanceof HTMLElement) {
                newContainer = angular.element(newContainer);
            } else if (typeof newContainer.append === 'function') {
                newContainer = angular.element(newContainer[newContainer.length - 1]);
            } else if (typeof newContainer === 'string') {
                newContainer = this.$element.parents().find(newContainer);
            }

            if (newContainer != null && (!Array.isArray(newContainer) ||
                    (Array.isArray(newContainer) && newContainer.length > 0))) {
                return this.changeContainer(newContainer);
            } else {
                throw new Error("Invalid pip-scroll-container attribute.");
            }
        }

    }

    const InfiniteScroll = function (
        $rootScope: ng.IRootScopeService,
        $window: ng.IWindowService,
        $interval: ng.IIntervalService
    ) {
        return {
            scope: {
                pipInfiniteScroll: '&',
                pipScrollContainer: '=',
                pipScrollDistance: '=',
                pipScrollDisabled: '=',
                pipScrollUseDocumentBottom: '=',
                pipScrollListenForEvent: '@'
            },
            link: function (
                $scope: InfiniteScrollScope,
                $element: JQuery,
                $attrs: InfiniteScrollAttributes
            ) {
                new InfiniteScrollLink($rootScope, $window, $interval, $scope, $element, $attrs);
            }
        }
    }

    angular.module("pipInfiniteScroll", [])
        .directive('pipInfiniteScroll', InfiniteScroll);
}