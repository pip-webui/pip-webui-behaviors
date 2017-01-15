/**
 * @file Keyboard navigation with scrolling over non-focusable controls
 * @copyright Digital Living Software Corp. 2014-2016
 */

/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module("pipSelected", []);

    thisModule.directive('pipSelected', function ($parse, $mdConstant, $timeout) {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope: any, $element, $attrs: any) {
                var
                    indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null,
                    indexSetter = indexGetter ? indexGetter.assign : null,
                    idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null,
                    idSetter = idGetter ? idGetter.assign : null,
                    changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null,
                    enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null,
                    noScroll = toBoolean($attrs.pipNoScroll),
                    modifier = toBoolean($attrs.pipSkipHidden) ? ':visible' : '',
                    className = toBoolean($attrs.pipTreeList) ? '.pip-selectable-tree' : '.pip-selectable',
                    selectedIndex = indexGetter($scope),
                    currentElementTabinex = $element.attr('tabindex'),
                    pipSelectedWatch = $attrs.pipSelectedWatch,
                    isScrolled = false;

                // Set tabindex if it's not set yet
                $element.attr('tabindex', currentElementTabinex || 0);

                // Watch selected item index
                if (!toBoolean($attrs.pipTreeList)) {
                    $scope.$watch(indexGetter, function (newSelectedIndex) {
                        selectItem({ itemIndex: newSelectedIndex });
                    });
                } else {
                    $scope.$watch(idGetter, function (newSelectedId) {
                        setTimeout(function () {
                            selectItem({ itemId: newSelectedId, raiseEvent: true });
                        }, 0);
                    });
                }

                // Watch resync selection
                if (pipSelectedWatch) {
                    $scope.$watch(pipSelectedWatch, function () {
                        // Delay update to allow ng-repeat to update DOM
                        setTimeout(function () {
                            selectedIndex = indexGetter($scope);
                            selectItem({ itemIndex: selectedIndex });
                        }, 100);
                    });
                }

                // Select item defined by index
                selectItem({ itemIndex: selectedIndex, items: $element.find(className) });

                // Converts value into boolean
                function toBoolean(value) {
                    if (value == null) return false;
                    if (!value) return false;
                    value = value.toString().toLowerCase();
                    return value == '1' || value == 'true';
                };

                // Functions and listeners

                function selectItem(itemParams) {
                    if (isScrolled) return;
                    var itemIndex = itemParams.itemIndex,
                        itemId = itemParams.itemId,
                        items = itemParams.items || $element.find(className + modifier),
                        itemsLength = items.length,
                        item = (function () {
                            if (itemParams.item) return itemParams.item;
                            if (itemIndex === undefined && itemIndex === -1) {
                                itemIndex = items.index(items.filter('[pip-id=' + itemId + ']'));
                            }
                            if (itemIndex >= 0 && itemIndex < itemsLength) {
                                return items[itemIndex]
                            }
                        } ()),
                        raiseEvent = itemParams.raiseEvent;

                    if (item) {
                        $element.find(className).removeClass('selected md-focused');
                        item = angular.element(item)
                            .addClass('selected md-focused')
                            .focus(); // todo сдвигает список тут, на первом проходе
                        if (!noScroll) scrollToItem(item);
                        if (raiseEvent) defineSelectedIndex(items);
                    }
                };

                function defineSelectedIndex(items) {
                    var oldSelectedIndex = selectedIndex;
                    selectedIndex = -1;
                    for (var index = 0; index < items.length; index++) {
                        if ($(items[index]).hasClass('selected')) {
                            selectedIndex = index;

                            break;
                        }
                    }

                    // Execute callback to notify about item select
                    if (oldSelectedIndex != selectedIndex && selectedIndex !== -1) {
                        $scope.$apply(updateIndex);
                    } else {
                        $scope.$apply(onSelect);
                    }

                    function updateIndex() {
                        var selectedItem = angular.element(items[selectedIndex]),
                            selectedId = selectedItem.attr('pip-id');

                        if (indexSetter) indexSetter($scope, selectedIndex);
                        if (idSetter) idSetter($scope, selectedId);
                        onSelect();
                    };

                    function onSelect() {
                        var selectedItem = angular.element(items[selectedIndex]),
                            selectedId = selectedItem.attr('pip-id');

                        if (changeGetter) {
                            changeGetter($scope, {
                                $event: {
                                    target: $element,
                                    item: selectedItem,
                                    index: selectedIndex,
                                    id: selectedId,
                                    newIndex: selectedIndex,
                                    oldIndex: oldSelectedIndex
                                }
                            });
                        }
                    }
                };

                function scrollToItem($item) {
                    if (noScroll) return;

                    var
                        containerTop = $element.offset().top,
                        containerHeight = $element.height(),
                        containerBottom = containerTop + containerHeight,
                        itemTop = $item.offset().top,
                        itemHeight = $item.outerHeight(true),
                        itemBottom = itemTop + itemHeight,
                        containerScrollTop = $element.scrollTop();

                    isScrolled = true;
                    setTimeout(function () {
                        isScrolled = false;
                    }, 100);

                    if (containerTop > itemTop) {
                        $element.scrollTop(containerScrollTop + itemTop - containerTop);
                    }
                    else if (containerBottom < itemBottom) {
                        $element.scrollTop(containerScrollTop + itemBottom - containerBottom);
                    }

                };

                var touchStartX, touchStartY, trackingClick, trackingClickStart, targetElement, lastClickTime, cancelNextClick;

                function getTargetElementFromEventTarget(eventTarget) {

                    // On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
                    if (eventTarget.nodeType === Node.TEXT_NODE) {
                        return eventTarget.parentNode;
                    }

                    return eventTarget;
                };

                function touchHasMoved(event) {
                    var touch = event.changedTouches[0], boundary = 10; //Touchmove boundary, beyond which a click will be cancelled.

                    if (Math.abs(touch.pageX - touchStartX) > boundary || Math.abs(touch.pageY - touchStartY) > boundary) {
                        return true;
                    }

                    return false;
                };

                $element.on('click', className, function (event) {
                    selectItem({ item: event.currentTarget, raiseEvent: true });
                });

                $element.on('touchstart', className, function (ev) {
                    ev.preventDefault();
                    console.log('touchstart event', event);

                    event = ev.originalEvent;
                    if (event['targetTouches'].length > 1) {
                        return true;
                    }
                    let targetElement = getTargetElementFromEventTarget(event.target);
                    let touch = event['targetTouches'][0];

                    trackingClick = true;
                    trackingClickStart = event.timeStamp;
                    targetElement = targetElement;

                    touchStartX = touch.pageX;
                    touchStartY = touch.pageY;

                    if ((event.timeStamp - lastClickTime) < 200) { // 200 - tapdelay
                        event.preventDefault();
                    }

                    return true;
                });

                $element.on('touchmove', className, function (ev) {
                    if (!trackingClick) {
                        return true;
                    }
                    event = ev.originalEvent;
                    // If the touch has moved, cancel the click tracking
                    if (targetElement !== getTargetElementFromEventTarget(event.target) || touchHasMoved(event)) {
                        trackingClick = false;
                        targetElement = null;
                    }

                    return true;
                });

                $element.on('touchend', className, function (ev) {
                    var forElement, newTrackingClickStart, targetTagName, scrollParent, touch, newtargetElement = targetElement;

                    if (!trackingClick) {
                        return true;
                    }
                    event = ev.originalEvent;
                    // Prevent phantom clicks on fast double-tap (issue #36)
                    if ((event.timeStamp - lastClickTime) < 200) { // 200 - tapdelay
                        cancelNextClick = true;
                        return true;
                    }

                    if ((event.timeStamp - trackingClickStart) > 700) { // tapTimeout - 700
                        return true;
                    }

                    // Reset to prevent wrong click cancel on input (issue #156).
                    cancelNextClick = false;

                    lastClickTime = event.timeStamp;

                    newTrackingClickStart = trackingClickStart;
                    trackingClick = false;
                    trackingClickStart = 0;

                    selectItem({ item: ev.currentTarget, raiseEvent: true });

                    return false;
                });

                $element.on('touchcancel', className, function (ev) {
                    trackingClick = false;
                    targetElement = null;
                });


                $element.on('keydown', function (e) {
                    var keyCode = e.which || e.keyCode;

                    // Check control keyCode
                    if (keyCode == $mdConstant.KEY_CODE.ENTER || keyCode == $mdConstant.KEY_CODE.SPACE) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (enterSpaceGetter) {
                            enterSpaceGetter($scope, {
                                $event: {
                                    target: $element,
                                    index: selectedIndex,
                                    item: $element.find('.selected')
                                }
                            });
                        }

                    } else
                        if (keyCode == $mdConstant.KEY_CODE.LEFT_ARROW || keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW ||
                            keyCode == $mdConstant.KEY_CODE.UP_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) {

                            e.preventDefault();
                            e.stopPropagation();

                            // Get next selectable control index
                            var items = $element.find(className + modifier),
                                inc = (keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1,
                                newSelectedIndex = selectedIndex + inc;

                            // Set next control as selected
                            selectItem({ itemIndex: newSelectedIndex, items: items, raiseEvent: true });
                        }
                });

                $element.on('focusin', function (event) {
                    // Choose selected element
                    var items,
                        selectedItem = $element.find(className + '.selected');

                    selectedItem.addClass('md-focused');

                    // If there are not selected elements then pick the first one
                    if (selectedItem.length === 0) {
                        selectedIndex = indexGetter($scope);
                        items = $element.find(className + modifier);
                        selectItem({ itemIndex: selectedIndex || 0, items: items, raiseEvent: true });
                    }
                });

                $element.on('focusout', function (event) {
                    $element.find(className + '.md-focused' + modifier).removeClass('md-focused');
                });
            }
        };
    });

})();

