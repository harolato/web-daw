angular.module('waw', []).
    controller('mainController',['$scope', function($scope){
        var vm = this;
        vm.message = "WAW";
    }]).
    directive('addComponent', function($compile) {
        return {
            restrict : "A",
            scope : true,
            link : function (scope, element , attrs) {
                scope.createNew = function () {
                    console.log(scope);
                    var el = $compile("<" + attrs.addComponent + "></" + attrs.addComponent + ">")(scope);
                    element.parent().append(el);
                }
            }
        }
    })
    .directive('instrument', function ($compile, devicesService) {
        return {
            restrict : "E",
            scope : {
                instrument : '='
            },
            controller : function ($scope, $element) {
                vm = $scope;
                var o = devicesService.add(vm.name);
                vm.name = o._id;
                vm.nameChange = true;
                vm.changeName = function () {
                    vm.nameChange = !vm.nameChange;
                }
            },
            templateUrl : 'app/components/instrument/view.html'
        }
    })
    .directive('synth', function ($compile, audioCtx, masterGain, frequencyFilter) {
        return {
            restrict : "E",
            scope : true,
            templateUrl : 'app/components/instrument/synth-controls.html',
            controller : function ($scope, $element) {
                var vm = $scope;
                vm.audioCtx = audioCtx;
                vm.message = 'lol';
                vm.playing = false;
                vm.gainNode = vm.audioCtx.createGain();
                vm.gain = 0.5;
                vm.type = "sine";
                vm.freq1 = 400;
                vm.freq2 = 500;
                vm.freq3 = 300;
                vm.params = {
                  output : frequencyFilter.filter
                };
                vm.changeType = function () {
                    vm.oscillatorNode.type = vm.type;
                    vm.oscillatorNode2.type = vm.type;
                    vm.oscillatorNode3.type = vm.type;
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
                vm.play = function() {

                    vm.oscillatorNode = vm.audioCtx.createOscillator();
                    vm.oscillatorNode2 = vm.audioCtx.createOscillator();
                    vm.oscillatorNode3 = vm.audioCtx.createOscillator();

                    var finish = vm.params.output;
                    vm.oscillatorNode.connect(vm.gainNode);
                    vm.oscillatorNode2.connect(vm.gainNode);
                    vm.oscillatorNode3.connect(vm.gainNode);
                    vm.gainNode.connect(finish);

                    vm.oscillatorNode.frequency.value = vm.freq1;
                    vm.oscillatorNode.type = vm.type;

                    vm.oscillatorNode2.frequency.value = vm.freq2;
                    vm.oscillatorNode2.type = vm.type;

                    vm.oscillatorNode3.frequency.value = vm.freq3;
                    vm.oscillatorNode3.type = vm.type;


                    vm.oscillatorNode.start(0);
                    vm.oscillatorNode2.start(0);
                    vm.oscillatorNode3.start(0);
                }

                vm.stop = function() {
                    vm.oscillatorNode3.stop(0);
                    vm.oscillatorNode2.stop(0);
                    vm.oscillatorNode.stop(0);
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
    .factory('devicesService',['utilitiesService', function(utilitiesService) {
        var devices = {};
        devices.list = [];
        devices.add = function (name) {
            var device = {
                '_id' : utilitiesService.uniqueId(),
                'name' : name,
                instance : null,
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
    }]).service('utilitiesService', function() {
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
    }).controller('devicesController', ['utilitiesService', 'devicesService', 'rootScope', function(utilitiesService, devicesService, rootScope) {
        var vm = this;
    }]);
console.log(1+1);

