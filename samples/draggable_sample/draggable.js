/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Draggable', []);

    thisModule.controller('DraggableController',
        function($scope, $timeout) {
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

            $scope.groups = [
                {source: [ {name: 'timer'}, {name: 'calendar'}, {name: 'picture slider'}, {name: 'statistics'} ]},
                {source: [ {name: 'map'}, {name: 'clocks'}, {name: 'note'} ,{name: 'event'} ]}
            ];

            let tileIndex;
            let groupIndex;

            $scope.onTileDrop = function(gIndex, tileData,  $event) {
                let draggedTile = $scope.groups[groupIndex].source[tileIndex];

                $scope.groups[groupIndex].source.splice(tileIndex, 1);
                $scope.groups[gIndex].source.push(draggedTile);
            }

            $scope.onTileDragStart = function(gIndex, tIndex, tileData,  $event) {
                tileIndex = tIndex;
                groupIndex = gIndex;
            }

            $scope.onTileMove = function($event) {
                console.log('$event move', $event);
            }

            $scope.onTileDragEnd = function(gIndex, tIndex, tileData,  $event) {
                $scope.groups[groupIndex].source.splice(tileIndex, 1);
            }

            $scope.onDiactive = function(gIndex, tileData,  $event) {
                console.log('on diactive', gIndex);
            }

            $scope.onEnter = function(gIndex, tileData,  $event) {
                console.log('enter group index:', gIndex);
                console.log('$target', $event);
            }

            $scope.onLeave = function(gIndex, tileData,  $event) {
                console.log('leave group index:', gIndex);
                console.log('$event', $event);
            }

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
