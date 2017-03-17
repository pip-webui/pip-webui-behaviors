{
    interface FocusedScope extends ng.IScope {
        pipFocusedColor: Function;
        pipFocusedRebind: Function;
        pipFocusedTabindex: Function;
        pipFocusedOpacity: Function;
        pipFocusedData: Function;
        pipWithHidden: Function;
        pipRebind: Function;
    }

    interface FocusedAttributes extends ng.IAttributes {
        ngModel: any;
        pipFocusedData: any;
    }

    class FocusedLink implements ng.IDirective {
        private controls: JQuery;
        private controlsLength: number;
        private color: string;
        private opacityDelta: number = 0.4;
        private opacityLimit: number = 0.5;

        constructor(
            private $scope: FocusedScope,
            private $element: JQuery,
            $attrs: FocusedAttributes,
            private $timeout: ng.ITimeoutService,
            private $mdConstant: any,
            private $window: ng.IWindowService
        ) {

            $element.on('keydown', (e) => {
                this.keydownListener(e);
            });

            $timeout(() => {
                this.init();
            });

            if ($attrs.ngModel) {
                $scope.$watch('ngModel', function () {
                    $timeout(this.init);
                }, true);
            }

            if ($attrs.pipFocusedData) {
                $scope.$watch('pipFocusedData', function () {
                    $timeout(this.init);
                }, true);
            }
        }

        private init() {
            const selector = this.$scope.pipWithHidden && this.$scope.pipWithHidden() ? '.pip-focusable' : '.pip-focusable:visible';
            this.controls = this.$element.find(selector);
            this.controlsLength = this.controls.length;
            this.checkTabindex(this.controls);
            // Add event listeners
            this.controls.on('focus', (event) => {
                const target = event.currentTarget;
                if ($(target).hasClass('md-focused')) {
                    return;
                }
                if (this.$scope.pipRebind && this.$scope.pipRebind()) {
                    this.init();
                }
                this.$element.addClass('pip-focused-container');
                if (!this.$scope.pipFocusedOpacity || !this.$scope.pipFocusedOpacity()) {

                    this.color = $(target).css('backgroundColor');
                    $(target).css('backgroundColor', this.rgba(this.color));
                    $(target).addClass('md-focused');
                } else {
                    $(target).addClass('md-focused md-focused-opacity');
                }

            }).on('focusout', (event) => {
                const target = event.currentTarget;
                if (!$(target).hasClass('md-focused')) {
                    return;
                }
                this.$element.removeClass('pip-focused-container');

                if (!this.$scope.pipFocusedOpacity || !this.$scope.pipFocusedOpacity()) {
                    // $(this).css('backgroundColor', _color);
                    $(target).css('backgroundColor', "");
                    $(target).removeClass('md-focused md-focused-opacity');
                } else {
                    $(target).removeClass('md-focused');
                }
            });
        }

        private rgba(color) {
            if (this.$scope.pipFocusedColor && this.$scope.pipFocusedColor()) {
                return this.$scope.pipFocusedColor();
            }

            const arr = color.split("(")[1].split(")")[0].split(",");

            if (!arr || arr.length < 3) {
                return ''
            }

            let red, blue, green, opacity;

            opacity = arr.length == 3 ? 1 : parseFloat(arr[3]);
            red = arr[0];
            blue = arr[1];
            green = arr[2];

            if (opacity < this.opacityLimit) {
                opacity += this.opacityDelta;
            } else {
                opacity -= this.opacityDelta;
            }

            return 'rgba(' + red + ', ' + blue + ', ' + green + ', ' + opacity + ')';
        }

        private setTabindex(element, value) {
            element.attr('tabindex', value);
        }

        private checkTabindex(controls) {
            const index = _.findIndex(controls, (c) => {
                return c['tabindex'] > -1;
            });

            if (index == -1 && controls.length > 0 && this.$scope.pipFocusedTabindex) {
                this.setTabindex(angular.element(controls[0]), this.$scope.pipFocusedTabindex());
            }
        }

        private keydownListener(e) {
            const keyCode = e.which || e.keyCode;
            // Check control keyCode
            if (keyCode == this.$mdConstant.KEY_CODE.LEFT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.UP_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW
            ) {
                e.preventDefault();

                const
                    increment = (keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1,
                    moveToControl = this.controls.index(this.controls.filter(".md-focused")) + increment;
                // Move focus to next control
                if (moveToControl >= 0 && moveToControl < this.controlsLength) {
                    this.controls[moveToControl].focus();
                }
            }
        }
    }

    const Focused = function ($timeout: ng.ITimeoutService, 
        $mdConstant: any, 
        $window: ng.IWindowService
    ): ng.IDirective {
        return {
            scope: {
                pipFocusedColor: '&?',
                pipFocusedRebind: '&?',
                pipFocusedTabindex: '&?',
                pipFocusedOpacity: '&?',
                pipFocusedData: '&?',
                pipWithHidden: '&?',
                pipRebind: '&?'
            },
            link: function($scope: FocusedScope, $element: JQuery, $attrs: FocusedAttributes) {
                new FocusedLink($scope, $element, $attrs, $timeout, $mdConstant, $window);
            }
        }
    }

    angular.module("pipFocused", [])
        .directive('pipFocused', Focused);
}