angular.module('waw', ['synth', 'devices']).
controller('mainController',['$scope', function($scope){
    var vm = this;
    vm.message = "WAW";
}]).
    directive('addComponent' , ['$compile', 'utilitiesService',function($compile, utilitiesService) {
        return {
            restrict : "A",
            scope : true,
            link : function (scope, element , attrs) {
                scope.createNew = function () {
                    //console.log(scope);
                    var el = $compile("<" + attrs.addComponent + "></" + attrs.addComponent + ">")(scope);
                    if ( attrs.addComponent == "device" ) {
                        el.attr('data-id', utilitiesService.uniqueId());
                    } else {
                        el.attr('shit', 'device');
                    }
                    element.parent().append(el);
                }
            }
        }
    }])
    // Audio context object
    .factory('audioCtx', function () {
        var ctx = {};
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        return ctx;
    })
    // Master gain object
    .directive('masterGain', function(masterGain, frequencyFilter) {
        return {
            restrict : "E",
            scope : {
                value : '='
            },
            controller : function ( $scope, $element ) {
                $scope.gain = 0.5;
                $scope.changeVolume = function () {
                    masterGain.gain.value = $scope.gain;

                }
            },
            template : 'Master Gain(Volume)' +
            '<input ng-change="changeVolume()" ng-model="gain" type="range" min="0" max="1" step=".0001">'
        }
    }).
    // Devices storage
    service('devicesService',['utilitiesService', function(utilitiesService) {
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
            effects_chain : null,
        };
        // Push initial data to global device array
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
            var device = allDevices[i];
            if ( id == device._id ) {
                device.note_input = !device.note_input;
            } else {
                device.note_input = false;
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
}])
    // Filter
    .directive('filter', function(masterGain, frequencyFilter) {
        return {
            restrict : "E",
            scope : {
                value : '='
            },
            controller : function ( $scope, $element ) {
                $scope.freq = 0;
                $scope.Q = 0;
                $scope.changeFreq = function () {
                    frequencyFilter.filter.frequency.value = $scope.freq;
                }
                $scope.changeQ = function () {
                    frequencyFilter.filter.Q.value = $scope.Q;
                }
            },
            template : '<p>Master low pass frequency filter</p>' +
            '<input ng-change="changeFreq()" ng-model="freq" type="range" min="0" max="350" step=".0001">' +
            '<input ng-change="changeQ()" ng-model="Q" type="range" min="0" max="10" step=".0001">'
        }
    })
    .factory('masterGain', function(audioCtx){
        var mGain = audioCtx.createGain();
        mGain.gain.value = 0.5;
        mGain.connect(audioCtx.destination);
        return mGain;
    })
    .factory('frequencyFilter', function(audioCtx, masterGain){
        var filter = audioCtx.createBiquadFilter();

        var obj = {
            filter : filter,
            input : null,
            output : masterGain,
            join : function (instrument) {
                this.input = instrument;
                instrument.connect(this.filter);
            }
        };
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 10;
        filter.connect(obj.output)
        return obj;
    })
    .service('utilitiesService', function() {
    this.uniqueId = function () {
        var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode=Math.floor((Math.random()*42)+48);
            if (ascicode<58 || ascicode>64){
                // exclude all chars between : (58) and @ (64)
                idstr+=String.fromCharCode(ascicode);
            }
        } while (idstr.length<32);

        return (idstr);
    }
});


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
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('keyboard',[]);
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('synth', []).
directive('synth', function ($compile, audioCtx, masterGain, frequencyFilter) {
    return {
        restrict : "E",
        scope : {
            shit : '='
        },
        require: '^device',
        templateUrl : 'app/components/synth/view.html',
        //link : function (a, b, c, d) {
        //},
        controller : function ($scope, $element) {
            var vm = $scope;
            console.log(vm.shit);
            vm.audioCtx = audioCtx;
            vm.playing = false;
            vm.gainNode = vm.audioCtx.createGain();
            vm.gain = 0.5;
            vm.type = "sine";
            vm.params = {
                output : masterGain
            };
            vm.gainNode.connect(vm.params.output);
            vm.out = 0;
            vm.changeOutput = function () {
                vm.gainNode.disconnect();
                if ( vm.out == 1 ) {
                    vm.params.output = masterGain
                } else {
                    vm.params.output = frequencyFilter.filter
                }
                vm.gainNode.connect(vm.params.output);
            };
            vm.changeType = function () {
                vm.oscillatorNode.type = vm.type;
            };
            vm.changeVolume = function() {
                vm.gainNode.gain.value = vm.gain;
            }
            vm.gainNode.gain.value = vm.gain;
            keyboard.keyDown = function (note, freq) {
                vm.play(freq);
            }
            keyboard.keyUp = function (note, freq) {
                vm.stop(freq);
            }
            vm.chords = [];

            vm.play = function(freq) {

                oscillatorNode = vm.audioCtx.createOscillator();

                oscillatorNode.connect(vm.gainNode);

                oscillatorNode.frequency.value = freq;
                oscillatorNode.type = vm.type;


                oscillatorNode.start(0);
                vm.chords.push(oscillatorNode);
            }

            vm.stop = function(frequency) {
                var new_chords = [];
                for ( var i = 0 ; i < vm.chords.length ; i++ ) {
                    if ( Math.round(vm.chords[i].frequency.value) === Math.round(frequency) ) {
                        vm.chords[i].stop(0);
                        vm.chords[i].disconnect();
                    } else {
                        new_chords.push(vm.chords[i]);
                    }
                }
                vm.chords = new_chords;
            }

            vm.toggleStart = function(){
                if ( !vm.playing ) {
                    vm.play();
                } else {
                    vm.stop();
                }
                vm.playing = !vm.playing;
            };
        }

    }
});