/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.FreezeScroll', []);


    thisModule.controller('FreezeScrollController',
        function($scope,  $anchorScroll) {
            $scope.items = [];
            $scope.items = generateItems(40, 0);

            $scope.updateItems = updateItems;

            var tableOffset = $(".wrapper").offset().top;

            console.log('tableOffset', tableOffset);


            $('.wrapper').bind("scroll", function() {
                var offset = $(this).scrollTop();
                console.log('scroll', offset);
            });

            return ;

            function generateItems(count, start) {
                var items = [], 
                    itemCount,
                    colors = ['#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C'];

                if (start) itemCount = start;
                else itemCount = 0;

                for (var i = 0; i < count; i++) {
                    var item = {
                        id: itemCount,
                        sort: Math.floor(Math.random()*10000),
                        name: 'Item ' + itemCount,
                        style: {'background-color': colors[_.random(0, colors.length - 1)], color: 'white', 'margin-bottom': '0px'}
                    };
                    itemCount++;

                    items.push(item);
                }

                return items;
            };

            function updateItems() {
                var items = generateItems(10, $scope.items.length);

                $scope.items = _.union($scope.items, items);
            }

            // function scrollToAnchor() {
            //     $anchorScroll();
            // }

        }
    );

})();



