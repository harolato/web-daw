/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('Devices', ['Instruments']).
directive('notesPreview', [function(){
    return {
        restrict : "A",
        require : "^device",
        template : '<p>Preview of current notes</p>'
    }
}]).
directive('toggleDeviceState', ['$compile', function($compile){
    return {
        restrict : "A",
        require: '^device',
        scope : true,
        link : function ($scope, element ,attrs, controller) {
            $scope.device = controller.scope.device;
            element.on('click', function () {
                controller.scope.toggleEnabled();
                controller.scope.$apply();
            });
            $scope.addClass = function (){
                return {
                    'fa-toggle-on' : $scope.device.enabled,
                    'fa-toggle-off' : !$scope.device.enabled
                }
            };

        },
        template : '<span ng-class="addClass()" class="fa"></span> On/Off'
    }
}])
.directive('toggleKeyboardInput', [function(){
    return {
        restrict : "A",
        require: '^device',
        scope : true,
        link : function ($scope, element ,attrs, controller) {
            $scope.device = controller.scope.device;
            element.on('click', function () {
                controller.scope.toggleNoteInput();
                controller.scope.$apply();
            });
            $scope.addClass = function (){
                return {
                    'fa-circle' : $scope.device.note_input,
                    'fa-circle-o' : !$scope.device.note_input
                }
            };
        },
        template : '<span ng-class="addClass()" class="fa"></span> MIDI control'
    }
}])
.directive('slider', ['sliderHelper', function(sliderHelper){
    return {
        restrict : "A",
        require : 'ngModel',
        scope : true,
        link : function ($scope, $element, attrs, ngModel) {
            //console.log(ngModel);
            //console.log(ngModel.$viewValue);


            angular.element(document).ready(function(){
                $scope.Math = window.Math;
                var slider = $element[0].querySelector('.slider');
                var sliderValue = slider.querySelector('.value-bar');


                function updateModel ( value ) {
                    $scope.value = value;
                    ngModel.$setViewValue(value/100);
                    ngModel.$render();
                }
                ngModel.$render = function() {
                    $scope.value = ngModel.$viewValue * 100;
                    sliderValue.style.width = parseInt($scope.value)  + '%';
                };
                var value;
                angular.element(slider).on('mousedown', function (e) {
/////     Implement touch functionality
//                    if (e.type == "touchstart" ) {
//                        var ee = angular.element(slider)[0];
//                        console.log([
//                            ee.getBoundingClientRect()
//                        ]);
//                        console.log([
//                            e
//                        ]);
//                    }
                    e.preventDefault();
                    angular.element(slider).on('mousemove', function (e) {
                        e.preventDefault();

                        value = ( e.offsetX * 100 ) / slider.offsetWidth;
                        updateModel(value);
                        sliderValue.style.width = $scope.value + '%';
                        angular.element(slider).on('mouseout', function () {
                            angular.element(slider).off('mousemove');
                            angular.element(slider).off('mouseout');
                        });
                    });
                    $scope.value = ( e.offsetX * 100 ) / slider.offsetWidth;
                    updateModel(value);
                    sliderValue.style.width = $scope.value + '%';

                    angular.element(slider).on('mouseup, touchend', function (e) {
                        angular.element(slider).off('mousemove');
                        updateModel(value);
                    });
                })
            });
        },
        controller : function ( $scope ) {
            $scope.value = 0;
            $scope.sliderObject = sliderHelper.getSlider($scope.ctrl);
            $scope.sliderObject.value = $scope.value;

            $scope.$watch('value', function (val, old) {
                if (val !== old) {
                    $scope.sliderObject.value = val;
                }
            });
        },
        template : '<div class="slider"><div class="value-bar">{{Math.round(value)}}%</div></div>'
    }
}])
.service('sliderHelper' , [function () {
    var Slider = function ( device ) {
        this.device = device;
        this.value = null;
    };
    Slider.prototype.setValue = function ( value ) {
        this.value = value;
    };
    Slider.prototype.getValue = function ( type ) {
        switch ( type ) {
            case "%" : this.value;
            case type.indexOf("range|") > 0 : alert('asd') ;
        }
    }
    return {
        getSlider : function (device) {
            return new Slider(device);
        }
    }
}])
.directive('device', function ($compile, devicesService, InstrumentsService, masterGain, sliderHelper) {
    return {
        restrict : "A",
        scope : true,
        link : function (scope, element, attributes) {

        },
        controller : function ($scope, $element) {
            var vm = $scope;

            vm.params = {
                gain : 0.7
            };
            // Initialize device object for data binding
            var o = devicesService.add($element.attr('data-id'),vm);
            vm.device = o;
            //vm.device.instrument_instance = instrumentsService.load('simpleSynth', audioCtx, masterGain, vm.device);
            vm.volumeSlider = sliderHelper.getSlider(vm.device);
            vm.device.instrument_instance = InstrumentsService.getInstrument($element.attr('data-instrument'), vm.device);
            // Assign default device name
            vm.device.name = vm.device._id;
            vm.device.gainNode.connect(masterGain);
            vm.$watch('params.gain', function(val) {
                if ( !isNaN(val) ) {
                    vm.device.gainNode.gain.value = val;
                }
            });
            //console.log(vm.device);
            // Hidden input flag
            vm.nameChange = true;
            // Toggle name change input field
            vm.changeName = function () {
                vm.nameChange = !vm.nameChange;
            };
            // Toggle device state. Enable/Disable

            vm.toggleEnabled = function (nonDirective) {
                if (!nonDirective) vm.device.enabled = !vm.device.enabled;
                //console.log(vm.device.enabled);
            };
            //vm.$watch('device.note_input', function (n,o){
            //    console.log([vm.device.name,n,o]);
            //});
            // Toggle note input. Enable/Disable
            vm.toggleNoteInput = function (nonDirective) {
                if (!nonDirective) vm.device.note_input = !vm.device.note_input;
                devicesService.toggleNoteInput(vm.device._id);
            };
            // output current devices
            vm.cons = function () {
                console.log(devicesService.getAll());
            };
            vm.getDeviceClass = function () {
                return {
                    'device-disabled' : !vm.device.enabled
                }
            };
            this.scope = vm;
        },
        templateUrl : 'app/components/device/view.html'
    }
}).
service('devicesService',['utilitiesService','keyboardHelperService','audioCtx', function(utilitiesService, keyboardHelperService, audioCtx) {
    this.list = [];
    this.add = function (id, instance) {
        // Device model
        var device = {
            '_id' : id,
            'name' : null,
            device_instance : instance,
            instrument_instance : null,
            enabled : true,
            note_input : (this.list.length == 0),
            notes : null,
            gainNode : audioCtx.createGain(),
            effects_chain : null,
        };
        // Push initial data to global device array
        if (this.list.length == 0) {
            keyboardHelperService.setKeyboardUser(device);
        }
        this.list.push(device);
        //console.log(device);
        // Return current model for controller
        return device;
    };
    // Selects a device to stream notes from keyboard
    this.toggleNoteInput = function (id) {
        var i ;
        var allDevices = this.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            var d = allDevices[i];
            if ( id == d._id ) {
                keyboardHelperService.setKeyboardUser(d);
            } else {
                d.note_input = false;
            }
        }
    };
    this.get = function ( id ) {
        var i ;
        var allDevices = this.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            if ( id === allDevices[i].id ) {
                return allDevices[i];
            }
        }
    };
    //devices.connect = function (source, destination) {
    //    var sourceDevice = devices.get(source);
    //    var destinationDevice = devices.get(destination);
    //    source.output.push(destination);
    //    destination.input.push(source);
    //};
    this.getAll = function () {
        return this.list;
    }
}]).
controller('devicesController', ['utilitiesService', 'devicesService', function(utilitiesService, devicesService) {
    var vm = this;
}]);