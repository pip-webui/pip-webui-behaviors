{

    interface SelectedAttributes extends ng.IAttributes {
        pipSelected: any;
        pipSelectedId: any;
        pipSelect: any;
        pipEnterSpacePress: any;
        pipNoScroll: any;
        pipSkipHidden: any;
        pipTreeList: any;
        pipSelectedWatch: any;
    }

    class SelectedLink {
        private indexGetter: any;
        private indexSetter: any;
        private idSetter: any;
        private idGetter: any;
        private changeGetter: any;
        private enterSpaceGetter: any;
        private noScroll: any;
        private modifier: any;
        private className: any;
        private selectedIndex: any;
        private currentElementTabinex: any;
        private pipSelectedWatch: any;
        private isScrolled: any;
        // Variables for touch functions
        private touchStartX: any;
        private touchStartY: any;
        private trackingClick: any;
        private trackingClickStart: any;
        private targetElement: any;
        private lastClickTime: any;
        private cancelNextClick: any;
        // Constants for touch functions
        private touchBoundary: number = 10;
        private tapdelay: number = 200;
        private tapTimeout: number = 700;

        constructor(
            $parse: ng.IParseService,
            private $mdConstant: any,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope,
            private $element: JQuery,
            private $attrs: SelectedAttributes
        ) {
            this.indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null;
            this.indexSetter = this.indexGetter ? this.indexGetter.assign : null;
            this.idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null;
            this.idSetter = this.idGetter ? this.idGetter.assign : null;
            this.changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null;
            this.enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null;
            this.noScroll = $attrs.pipNoScroll;
            this.modifier = $attrs.pipSkipHidden ? ':visible' : '';
            this.className = $attrs.pipTreeList ? '.pip-selectable-tree' : '.pip-selectable';
            this.selectedIndex = this.indexGetter($scope);
            this.currentElementTabinex = $element.attr('tabindex');
            this.pipSelectedWatch = $attrs.pipSelectedWatch;
            this.isScrolled = false;

            $element.attr('tabindex', this.currentElementTabinex || 0);

            $element.on('click', this.className, (event) => {
                this.onClickEvent(event);
            });
            $element.on('touchstart', this.className, (event) => {
                this.onTouchStart(event);
            });
            $element.on('touchmove', this.className, (event) => {
                this.onTouchMove(event);
            });
            $element.on('touchend', this.className, (event) => {
                this.onTouchEnd(event);
            });
            $element.on('touchcancel', this.className, (event) => {
                this.onTouchCancel(event);
            });
            $element.on('keydown', (event) => {
                this.onKeyDown(event);
            });
            $element.on('focusin', (event) => {
                this.onFocusIn(event);
            });
            $element.on('focusout', (event) => {
                this.onFocusOut(event);
            });

            // Watch selected item index
            if (!$attrs.pipTreeList) {
                $scope.$watch(this.indexGetter, (newSelectedIndex) => {
                    this.selectItem({
                        itemIndex: newSelectedIndex
                    });
                });
            } else {
                $scope.$watch(this.idGetter, (newSelectedId) => {
                    $timeout(() => {
                        this.selectItem({
                            itemId: newSelectedId,
                            raiseEvent: true
                        });
                    }, 0);
                });
            }

            // Watch resync selection
            if (this.pipSelectedWatch) {
                $scope.$watch(this.pipSelectedWatch, () => {
                    // Delay update to allow ng-repeat to update DOM
                    $timeout(() => {
                        this.selectedIndex = this.indexGetter($scope);
                        this.selectItem({
                            itemIndex: this.selectedIndex
                        });
                    }, 100);
                });
            }

            // Select item defined by index
            this.selectItem({
                itemIndex: this.selectedIndex,
                items: $element.find(this.className)
            });
        }

        private selectItem(itemParams) {
            if (this.isScrolled) return;
            let itemIndex = itemParams.itemIndex,
                itemId = itemParams.itemId,
                items = itemParams.items || this.$element.find(this.className + this.modifier),
                itemsLength = items.length,
                item = () => {
                    if (itemParams.item) return itemParams.item;
                    if (itemIndex === undefined && itemIndex === -1) {
                        itemIndex = items.index(items.filter('[pip-id=' + itemId + ']'));
                    }
                    if (itemIndex >= 0 && itemIndex < itemsLength) {
                        return items[itemIndex]
                    }

                    return false;
                },
                raiseEvent = itemParams.raiseEvent;
                item = item();
            if (item) {
                this.$element.find(this.className).removeClass('selected md-focused');
                item = <any>angular.element(item)
                    .addClass('selected md-focused')
                    .focus();
                if (!this.noScroll) this.scrollToItem(item);
                if (raiseEvent) this.defineSelectedIndex(items);
            }
        };

        private defineSelectedIndex(items) {
            const oldSelectedIndex = this.selectedIndex;
            this.selectedIndex = -1;
            for (var index = 0; index < items.length; index++) {
                if ($(items[index]).hasClass('selected')) {
                    this.selectedIndex = index;

                    break;
                }
            }

            // Execute callback to notify about item select
            if (oldSelectedIndex != this.selectedIndex && this.selectedIndex !== -1) {
                this.$scope.$apply(updateIndex);
            } else {
                this.$scope.$apply(onSelect);
            }

            function updateIndex() {
                const selectedItem = angular.element(items[this.selectedIndex]),
                    selectedId = selectedItem.attr('pip-id');

                if (this.indexSetter) this.indexSetter(this.$scope, this.selectedIndex);
                if (this.idSetter) this.idSetter(this.$scope, selectedId);
                onSelect();
            };

            function onSelect() {
                const selectedItem = angular.element(items[this.selectedIndex]),
                    selectedId = selectedItem.attr('pip-id');

                if (this.changeGetter) {
                    this.changeGetter(this.$scope, {
                        $event: {
                            target: this.$element,
                            item: selectedItem,
                            index: this.selectedIndex,
                            id: selectedId,
                            newIndex: this.selectedIndex,
                            oldIndex: oldSelectedIndex
                        }
                    });
                }
            }
        };

        private scrollToItem($item) {
            if (this.noScroll || !$item.offset()) return;

            const
                containerTop = this.$element.offset().top,
                containerHeight = this.$element.height(),
                containerBottom = containerTop + containerHeight,
                itemTop = $item.offset().top,
                itemHeight = $item.outerHeight(true),
                itemBottom = itemTop + itemHeight,
                containerScrollTop = this.$element.scrollTop();

            this.isScrolled = true;
            this.$timeout(() => {
                this.isScrolled = false;
            }, 100);

            if (containerTop > itemTop) {
                this.$element.scrollTop(containerScrollTop + itemTop - containerTop);
            } else if (containerBottom < itemBottom) {
                this.$element.scrollTop(containerScrollTop + itemBottom - containerBottom);
            }
        };

        private getTargetElementFromEventTarget(eventTarget) {
            // On some older browsers the event target may be a text node.
            if (eventTarget.nodeType === Node.TEXT_NODE) {
                return eventTarget.parentNode;
            }

            return eventTarget;
        };

        private touchHasMoved(event) {
            const touch = event.changedTouches[0],
                boundary = this.touchBoundary; // Touchmove boundary, beyond which a click will be cancelled.

            if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
                return true;
            }

            return false;
        };

        private onClickEvent(event) {
            this.selectItem({
                item: event.currentTarget,
                raiseEvent: true
            });
        }

        private onTouchStart(event) {
            const ev = event.originalEvent;
            if (ev['targetTouches'].length > 1) {
                return true;
            }
            const targetElement = this.getTargetElementFromEventTarget(ev.target),
                touch = ev['targetTouches'][0];

            this.trackingClick = true;
            this.trackingClickStart = ev.timeStamp;
            this.targetElement = targetElement;

            this.touchStartX = touch.pageX;
            this.touchStartY = touch.pageY;

            /*if ((ev.timeStamp - this.lastClickTime) < this.tapdelay) {
                //  event.preventDefault();
            }*/

            return true;
        }

        private onTouchMove(event) {
            if (!this.trackingClick) {
                return true;
            }
            const ev = event.originalEvent;
            // If the touch has moved, cancel the click tracking
            if (this.targetElement !== this.getTargetElementFromEventTarget(ev.target) || this.touchHasMoved(ev)) {
                this.trackingClick = false;
                this.targetElement = null;
            }

            return true;
        }

        private onTouchEnd(event) {
            let forElement, newTrackingClickStart, targetTagName, scrollParent, touch, newtargetElement = this.targetElement;

            if (!this.trackingClick) {
                return true;
            }
            const ev = event.originalEvent;
            // Prevent phantom clicks on fast double-tap 
            if ((ev.timeStamp - this.lastClickTime) < this.tapdelay) {
                this.cancelNextClick = true;
                return true;
            }

            if ((ev.timeStamp - this.trackingClickStart) > this.tapTimeout) {
                return true;
            }

            // Reset to prevent wrong click cancel on input 
            this.cancelNextClick = false;

            this.lastClickTime = event.timeStamp;

            newTrackingClickStart = this.trackingClickStart;
            this.trackingClick = false;
            this.trackingClickStart = 0;

            this.selectItem({
                item: event.currentTarget,
                raiseEvent: true
            });

            return false;
        }

        private onTouchCancel(event) {
            this.trackingClick = false;
            this.targetElement = null;
        }

        private onKeyDown(event) {
            var keyCode = event.which || event.keyCode;

            // Check control keyCode
            if (keyCode == this.$mdConstant.KEY_CODE.ENTER || keyCode == this.$mdConstant.KEY_CODE.SPACE) {
                event.preventDefault();
                event.stopPropagation();

                if (this.enterSpaceGetter) {
                    this.enterSpaceGetter(this.$scope, {
                        $event: {
                            target: this.$element,
                            index: this.selectedIndex,
                            item: this.$element.find('.selected')
                        }
                    });
                }

            } else
            if (keyCode == this.$mdConstant.KEY_CODE.LEFT_ARROW || keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.UP_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW
            ) {
                event.preventDefault();
                event.stopPropagation();

                // Get next selectable control index
                const items = this.$element.find(this.className + this.modifier),
                    inc = (keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1,
                    newSelectedIndex = this.selectedIndex + inc;

                // Set next control as selected
                this.selectItem({
                    itemIndex: newSelectedIndex,
                    items: items,
                    raiseEvent: true
                });
            }
        }

        private onFocusIn(event) {
            // Choose selected element
            let items,
                selectedItem = this.$element.find(this.className + '.selected');

            selectedItem.addClass('md-focused');

            // If there are not selected elements then pick the first one
            if (selectedItem.length === 0) {
                this.selectedIndex = this.indexGetter(this.$scope);
                items = this.$element.find(this.className + this.modifier);
                this.selectItem({
                    itemIndex: this.selectedIndex || 0,
                    items: items,
                    raiseEvent: true
                });
            }
        }

        private onFocusOut(event) {
            this.$element.find(this.className + '.md-focused' + this.modifier).removeClass('md-focused');
        }
    }

    const Selected = function (
        $parse: ng.IParseService,
        $mdConstant: any,
        $timeout: ng.ITimeoutService
    ): ng.IDirective {
        return {
            restrict: 'A',
            scope: false,
            link: function (
                $scope: ng.IScope,
                $element: JQuery,
                $attrs: SelectedAttributes
            ) {
                new SelectedLink($parse, $mdConstant, $timeout, $scope, $element, $attrs);
            }
        }
    }

    angular.module("pipSelected", [])
        .directive('pipSelected', Selected);
}