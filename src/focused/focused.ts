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
                    focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null;

                $timeout(init);
                $element.on('keydown', keydownListener);

                $scope.$watch($attrs.ngModel, function () {
                    $timeout(init);
                }, true);

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
                    element.attr('tabindex', '0');
                }

                function init() {
                    var selector = withHidden ? '.pip-focusable' : '.pip-focusable:visible';
                    controls = $element.find(selector);
                    controlsLength = controls.length;
                    // add needed event listeners
                    controls.on('focus', function () {
                        if ($(this).hasClass('md-focused')) {
                            return;
                        }
                        _color = $(this).css('backgroundColor');
                        $element.addClass('pip-focused-container');
                        $(this).addClass('md-focused');
                        $(this).css('backgroundColor', rgba(_color));

                        setTabindex(angular.element($(this)[0]), '0');
                    }).on('focusout', function () {
                        $element.removeClass('pip-focused-container');
                        $(this).removeClass('md-focused');
                        $(this).css('backgroundColor', _color);

                        setTabindex(angular.element($(this)[0]), '1');
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

