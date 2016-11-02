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

            // $location.hash('#items-20')

            return ;

            function generateItems(count, start) {
                var items = [], 
                    itemCount,
                    colors = ['red', 'blue', 'yellow', 'green'];

                if (start) itemCount = start;
                else itemCount = 0;

                for (var i = 0; i < count; i++) {
                    var item = {
                        id: itemCount,
                        sort: Math.floor(Math.random()*10000),
                        name: 'Item ' + itemCount,
                        color: colors[_.random(0, colors.length - 1)]
                    };
                    itemCount++;

                    items.push(item);
                }

                return _.sortBy(items, function(item) { return item.sort });
            };

            function updateItems() {
                var items = generateItems(10, $scope.items.length);

                $scope.items = _.sortBy(_.union($scope.items, items), function(item) { return item.sort });
            }

            // function scrollToAnchor() {
            //     $anchorScroll();
            // }

        }
    );

})();



