/**
 * @file Keyboard navigation over few focusable controls
 * @copyright Digital Living Software Corp. 2014-2016
 */

/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module("pipFocused", []);

    thisModule.directive('pipFocused', function ($timeout, $mdConstant, $window) {
        return {
            require: "?ngModel",
            link: function ($scope: any, $element, $attrs: any) {
                var controls, controlsLength,
                    withHidden = $attrs.pipWithHidden,
                    opacityDelta = 0.4,
                    opacityLimit = 0.5,
                    _color,
                    focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null,
                    reInit = $attrs.pipFocusedRebind ? $attrs.pipFocusedRebind : null,
                    focusedTabindex = $attrs.pipFocusedTabindex ? parseInt($attrs.pipFocusedTabindex) || 0 : 0,
                    isOpacity = $attrs.pipFocusedOpacity ? toBoolean($attrs.pipFocusedOpacity) : false;

                $timeout(init);
                $element.on('keydown', keydownListener);

                if ($attrs.ngModel) {
                    $scope.$watch($attrs.ngModel, function () {
                        $timeout(init);
                    }, true);
                }

                // Converts value into boolean
                function toBoolean(value) {
                    if (value == null) return false;
                    if (!value) return false;
                    value = value.toString().toLowerCase();
                    return value == '1' || value == 'true';
                };

                function rgba(color) {
                    if (focusedColor) {
                        return focusedColor;
                    }

                    var arr = color.split("(")[1].split(")")[0].split(",");

                    if (!arr || arr.length < 3) {
                        return ''
                    }

                    let red, blue, green, opacity;

                    opacity = arr.length == 3 ? 1 : parseFloat(arr[3]);
                    red = arr[0];
                    blue = arr[1];
                    green = arr[2];

                    if (opacity < opacityLimit) {
                        opacity += opacityDelta;
                    } else {
                        opacity -= opacityDelta;
                    }

                    return 'rgba(' + red + ', ' + blue + ', ' + green + ', ' + opacity + ')';
                }

                function setTabindex(element, value) {
                    element.attr('tabindex', value);
                }

                function checkTabindex(controls) {
                    let index = _.findIndex(controls, (c) => {
                        return c['tabindex'] > -1;
                    });

                    if (index == -1 && controls.length > 0) {
                        // let el = controls[0];
                        setTabindex(angular.element(controls[0]), focusedTabindex);
                    }
                }

                function init() {
                    var selector = withHidden ? '.pip-focusable' : '.pip-focusable:visible';
                    controls = $element.find(selector);
                    controlsLength = controls.length;
                    checkTabindex(controls);
                    // add needed event listeners
                    controls.on('focus', function () {
                        if ($(this).hasClass('md-focused')) {
                            return;
                        }
                        if (reInit) {
                            init();
                        }
                        $element.addClass('pip-focused-container');
                        if (isOpacity) {
                            let ell = angular.element($(this)[0]);

                            _color = $(this).css('backgroundColor');
                            // _color = $window.getComputedStyle($(this)[0], null).backgroundColor;
                            $(this).css('backgroundColor', rgba(_color));
                            $(this).addClass('md-focused');
                        } else {
                            $(this).addClass('md-focused md-focused-opacity');
                        }
                        
                        // setTabindex(angular.element($(this)[0]), 0);
                    }).on('focusout', function () {
                        if (!$(this).hasClass('md-focused')) {
                            return;
                        }                        
                        $element.removeClass('pip-focused-container');

                        if (isOpacity) {
                            // $(this).css('backgroundColor', _color);
                            $(this).css('backgroundColor', "");
                            $(this).removeClass('md-focused md-focused-opacity');
                        } else {
                            $(this).removeClass('md-focused');
                        }
                        // if I go from block all element have tabindex = -1
                        // setTabindex(angular.element($(this)[0]), -1);
                    });
                }

                function keydownListener(e) {
                    var keyCode = e.which || e.keyCode;
                    // Check control keyCode
                    if (keyCode == $mdConstant.KEY_CODE.LEFT_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.UP_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) {

                        e.preventDefault();

                        var
                            increment = (keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1,
                            moveToControl = controls.index(controls.filter(".md-focused")) + increment;
                        // Move focus to next control
                        if (moveToControl >= 0 && moveToControl < controlsLength) {
                            controls[moveToControl].focus();
                        }
                    }
                }
            }
        };
    });

})();

