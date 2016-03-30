angular.module('midiHandler',[]).
factory('requestMIDIAccess', ['$window', '$q',function ($window, $q) {
    var requestAccess = function () {
        var d = $q.defer();
        var p = d.promise;

        if ( $window.navigator && $window.navigator.requestMIDIAccess ) {
            $window.navigator.requestMIDIAccess().then(d.resolve, d.reject);
        } else {
            d.reject( new Error('Unable to gain access to WEB MIDI API'));
        }
        return p;
    }
    return {
        requestAccess : requestAccess
    };
}])

.factory("midiHandlerService", ['$window', 'requestMIDIAccess', '$q', '$rootScope',function($window, requestMIDIAccess, $q, $rootScope){
    var val = 0;
    var val1 = 0;
    var val2 = 0;
    var devices = [];
    var getIODevices = function () {
        var access = requestMIDIAccess.requestAccess();
        access.then(function (access){
            access.inputs.forEach(function ( i ) {
                devices.push({
                    device : null,
                    midi : i
                });
            });
            service.devices = devices;
        });
    };

    var note = function (note) {
        var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
            key_number,
            octave;

        if (note.length === 3) {
            octave = note.charAt(2);
        } else {
            octave = note.charAt(1);
        }
        key_number = notes.indexOf(note.slice(0, -1));

        if (key_number < 3) {
            key_number = key_number + 12 + ((octave - 1) * 12) + 1;
        } else {
            key_number = key_number + ((octave - 1) * 12) + 1;
        }

        return 440 * Math.pow(2, (key_number - 49) / 12);
    }

    var onMessage = function (e, user) {
        console.log(e, user);
            service.val1 = e.data[1];
            service.val2 = e.data[2];
            service.val = e.data[0];
        if ( e.data[0] == 147 ) {
            user.instrument_instance.play((440 * Math.pow(2, (e.data[1] - 69) / 12)));
        } else if ( e.data[0] == 131 ) {
            user.instrument_instance.stop((440 * Math.pow(2, (e.data[1] - 69) / 12)));
        }
    };


    var sendMessage = function () {

    };
    var connect = function (device, user) {
        if ( device && user ) {
            var d = findDevice(device);
            if ( d ) {
                if ( d.user ) {
                    console.log("Device is currently used by another instrument");
                } else {
                    d.user = user;
                    d.midi.onmidimessage = function (e) {
                        onMessage(e, user);
                    };
                }
            } else console.log("cant find dev");
        } else console.log("empty stuff");

    };
    var disconnect = function ( device ) {
        device.user = null;
    }
    var findDevice = function ( device ) {
        var result = null;
        devices.some(function ( d ) {

            if ( d.midi.id == device.midi.id  ) {
                //console.log(d.midi.id, device.midi.id);
                result = d;
                return true;
            }
        });
        return result;
    };
    var service = {
        get devices() {
          return devices;
        },
        set devices(a){
            devices = a;
            //$rootScope.$apply();
        },
        get val() {
            return val;
        } ,
        set val(a) {
            val = a;
            $rootScope.$apply();
        },
        get val1() {
            return val1;
        } ,
        set val1(a) {
            val1 = a;
            $rootScope.$apply();
        },
        get val2() {
            return val2;
        } ,
        set val2(a) {
            val2 = a;
            $rootScope.$apply();
        },
        getDevices : getIODevices,
        connectDevice : connect
    };
return service;
}]).controller('midiHandlerController', ['$scope', 'midiHandlerService', 'devicesService',function($scope, midiHandlerService, devicesService){
    midiHandlerService.getDevices();
    $scope.m = midiHandlerService;
    $scope.devices = $scope.m.devices;


    $scope.$watch('activeDevice', function(n){
        midiHandlerService.connectDevice(n,devicesService.get("anothersquaresynth"))
    });
}]);