/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('devices', []).

directive('device', function ($compile, devicesService) {
    return {
        restrict : "E",
        scope : true,
        link : function ($scope, $element) {
            var child = $scope.$first;
            console.log(child);
            var vm = $scope;
            // Initialize device object for data binding
            var o = devicesService.add($element.attr('data-id'),vm);
            vm.device = o;
            // Assign default device name
            vm.device.name = vm.device._id;
            vm.device.enabled = true;
            //console.log(vm.device);
            // Hidden input flag
            vm.nameChange = true;
            // Toggle name change input field
            vm.changeName = function () {
                vm.nameChange = !vm.nameChange;
            };
            // Toggle device state. Enable/Disable
            vm.toggleEnabled = function () {
                vm.device.enabled = !vm.device.enabled;
            };
            // Toggle note input. Enable/Disable
            vm.toggleNoteInput = function () {
                devicesService.toggleNoteInput(vm.device._id)
            };
            // output current devices
            vm.cons = function () {
                console.log(devicesService.getAll());
            };
        },
        templateUrl : 'app/components/device/view.html'
    }
}).
controller('devicesController', ['utilitiesService', 'devicesService', function(utilitiesService, devicesService, rootScope) {
    var vm = this;
}]);