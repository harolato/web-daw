angular.module('waw', ['synth', 'devices']).
controller('mainController',['$scope', function($scope){
    var vm = this;
    vm.message = "WAW v2";
}]).
    directive('addComponent', function($compile) {
        return {
            restrict : "A",
            scope : true,
            link : function (scope, element , attrs) {
                scope.createNew = function () {
                    console.log(scope);
                    var el = $compile("<" + attrs.addComponent + " instr='asd'></" + attrs.addComponent + ">")(scope);
                    element.parent().append(el);
                }
            }
        }
    })
    .factory('audioCtx', function () {
        var ctx = {};
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        return ctx;
    })
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
    })
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
        scope : true,
        require: '^device',
        templateUrl : 'app/components/synth/view.html',
        link : function (a, b, c, d) {
            console.log(d);
        },
        controller : function ($scope, $element) {
            var vm = $scope;
            vm.audioCtx = audioCtx;
            vm.playing = false;
            vm.gainNode = vm.audioCtx.createGain();
            vm.gain = 0.5;
            vm.type = "sine";
            vm.freq1 = 400;
            vm.freq2 = 500;
            vm.freq3 = 300;
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

            vm.changeFreq = function (id) {
                if (vm.playing) {
                    switch (id) {
                        case 1 :
                            vm.oscillatorNode.frequency.value = vm.freq1;
                            break;
                        case 2 :
                            vm.oscillatorNode2.frequency.value = vm.freq2;
                            break;
                        case 3 :
                            vm.oscillatorNode3.frequency.value = vm.freq3;
                            break;
                        default:
                            alert('error');
                    }
                }
            }
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