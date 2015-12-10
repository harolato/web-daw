/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('devices', []).

directive('device', function ($compile, devicesService) {
    return {
        restrict : "E",
        scope : true,
        controller : function ($scope, $element) {
            var o = devicesService.add($scope);
            $scope.name = o._id;
            $scope.nameChange = true;
            $scope.changeName = function () {
                $scope.nameChange = !$scope.nameChange;
            }
            console.log(devicesService.getAll()[0].instance.changeName());
        },
        templateUrl : 'app/components/device/view.html'
    }
}).

factory('devicesService',['utilitiesService', function(utilitiesService) {
    var devices = {};
    devices.list = [];
    devices.add = function (instance) {
        var device = {
            '_id' : utilitiesService.uniqueId(),
            'name' : null,
            instance : instance,
            'input' : [],
            'output' : []
        };
        devices.list.push(device);
        return device;
    };
    devices.get = function ( id ) {
        var i ;
        var allDevices = devices.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            if ( id === allDevices[i].id ) {
                return allDevices[i];
            }
        }
    };
    devices.connect = function (source, destination) {
        var sourceDevice = devices.get(source);
        var destinationDevice = devices.get(destination);
        source.output.push(destination);
        destination.input.push(source);
    };
    devices.getAll = function () {
        return devices.list;
    }
    return devices;
}]).

controller('devicesController', ['utilitiesService', 'devicesService', function(utilitiesService, devicesService, rootScope) {
    var vm = this;
}]);