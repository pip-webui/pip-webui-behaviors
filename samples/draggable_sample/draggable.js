/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Draggable', []);

    thisModule.controller('DraggableController',
        function($scope) {
            $scope.centerAnchor = true;

            $scope.toggleCenterAnchor = function () {
                $scope.centerAnchor = !$scope.centerAnchor;
            };

            $scope.content = [
                {
                    color: {'background-color':'#F1F8E9'},
                    name: 'F1F8E9'
                },
                {
                    color: {'background-color':'#DCEDC8'},
                    name: 'DCEDC8'
                },
                {
                    color: {'background-color':'#C5E1A5'},
                    name: 'C5E1A5'
                },
                {
                    color: {'background-color':'#AED581'},
                    name: 'AED581'
                },
                {
                    color: {'background-color':'#9CCC65'},
                    name: '9CCC65'
                },
                {
                    color: {'background-color':'#8BC34A'},
                    name: '8BC34A'
                },
                {
                    color: {'background-color':'#7CB342'},
                    name: '7CB342'
                },
                {

                    color: {'background-color':'#689F38'},
                    name: '689F38'
                },
                {

                    color: {'background-color':'#558B2F'},
                    name: '558B2F'
                },
                {

                    color: {'background-color':'#33691E'},
                    name: '33691E'
                }
            ];

            $scope.onDropSuccess = function (index, data, evt) {
                const otherObj = $scope.content[index];
                const otherIndex = $scope.content.indexOf(data);
                $scope.content.splice(otherIndex, 1);
                if (index > otherIndex) $scope.content.splice(index, 0, data);
                else $scope.content.splice(index + 1, 0, data);
            };

            $scope.onDragStart = function(data, event) {
                const index = $scope.content.indexOf(data);

                $($('.drag-scroll-test').find('[pip-drag]')[index + 1]).css('margin-top', '83px');
            }

            $scope.onDragStop = function(data, event) {
                const index = $scope.content.indexOf(data);

                $($('.drag-scroll-test').find('[pip-drag]')[index + 1]).css('margin-top', '0px');
            }
        }
    );

})();
