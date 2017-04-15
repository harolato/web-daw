
angular.module('midiHandler',[]).
    /*
    factory : requestMIDIAccess
    desc    : requests midi access from browsers
    return  : promise containing an object of midi access
     */
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
    /*
factory : midiHandlerService
desc    : Handles midi device connections. Keeps track of midi devices and their users(internal devices)
 */
.factory("midiHandlerService", ['$window', 'requestMIDIAccess', '$q', '$rootScope',function($window, requestMIDIAccess, $q, $rootScope){
    // Debugging
    var val = 0;
    var val1 = 0;
    var val2 = 0;
    // ---

    // List of midi devices together with their users
    var devices = [];
    // Get a list of midi devices attached to a computer
    var getIODevices = function () {
        // Get promise
        var access = requestMIDIAccess.requestAccess();
        // Initiate promise
        var inputs = [];
        var outputs = [];
        access.then(function (access){
            // If successful
            // Scan through all devices and add them to a list

            access.inputs.forEach(function ( i ) {
                inputs.push(i);
            });
            access.outputs.forEach(function( o ){
                outputs.push(o);
            });
            for ( var p = 0 ; p < inputs.length ; p++ ) {
                devices.push({
                    user : null,
                    midi : {
                        input : inputs[p],
                        output: outputs[p]
                    }
                });
            }
            service.devices = devices;
        });
    };

    var calcFreq = function (MIDINote) {
      return (440 * Math.pow(2, (MIDINote - 69) / 12))
    };

    // Callback for midi message
    var onMessage = function (e, user) {
        // Debugging
        service.val1 = e.data[1];
        service.val2 = e.data[2];
        service.val = e.data[0];
        // Key down event
        //console.log(e.data[0], e.data[1], e.data[2]);
        if ( e.data[0] == 144 && e.data[2] > 0 ) {
            // Send note signal to device
            user.instrument_instance.play(calcFreq(e.data[1]), null, e.data[2]);
        } else if ( e.data[0] == 128 || (e.data[0] == 144 && e.data[2] == 0) ) { // Key up event
            user.instrument_instance.stop(calcFreq(e.data[1]));
        }
    };
    function dec2hex(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }
    // Connect internal device together with external midi device
    var connect = function (device, user) {
        if ( device && user ) {
            var d = findDevice(device);
            if ( d >= 0 ) {
                if ( devices[d].user ) {
                    console.log("Device is currently used by another instrument", devices[d]);
                } else {
                    // Assign device instance
                    devices[d].user = user;
                    // Attach callback to midi message event
                    devices[d].midi.input.onmidimessage = function (e) {
                        onMessage(e, user);
                    };
                }
            } else console.log("cant find dev");
        }
    };
    // Disconnect internal device from midi device
    var disconnect = function ( device ) {
        var d = findDevice(device, true);
        if ( d >= 0 ) {
            // Clear callback and user
            devices[d].user = null;
            devices[d].midi.input.onmidimessage = null;
            for (var i = 21 ; i < 109 ; i++) {
                devices[d].midi.output.send(["0x"+dec2hex(144),"0x"+dec2hex(i),0x00]);
            }
        }
    };
    // Get midi device current device is using
    var getActiveDevice = function (d) {
        var d = findDevice(d, true);
        //console.log(d);
        if ( d > -1 ){
            return devices[d];
        } else {
            return null;
        }

    };

    var findDevice = function ( device, active ) {
        var result = null;
        devices.some(function ( d ) {
            if ( !active ) {
                if ( d.midi.input.id == device.midi.input.id  ) {
                    //console.log(d.midi.id, device.midi.id);
                    result = d;
                    return true;
                }
            } else {
                if ( d.user && ( d.user._id == device._id ) ) {
                    result = d;
                    return true;
                }
            }
        });
        return devices.indexOf(result);
    };

    // public service object
    var service = {
        // Getters and setters
        get devices() {
          return devices;
        },
        set devices(a){
            devices = a;
        },
        // Debugging
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
        // ----------
        getDevices : getIODevices,
        connectDevice : connect,
        disconnectDevice : disconnect,
        getActive : getActiveDevice
    };
    // Initiate device lookup
    service.getDevices();
    // return service object
    return service;
}])
    /*
    directive   : chooseMidiDevice
    desc        : create user interface component to interact with midiHandlerService
     */
.directive('chooseMidiDevice', ["midiHandlerService", function (midiHandlerService) {
 return {
     scope : true,
     restrict : "A",
     link : function ($scope, $element) {

     },
     controller : function ( $scope ) {
         $scope.m = midiHandlerService;
         $scope.devices = $scope.m.devices;
         $scope.activeDevice = $scope.m.getActive($scope.device);

         $scope.disconnect = function () {
             midiHandlerService.disconnectDevice($scope.device);
             $scope.activeDevice = $scope.m.getActive($scope.device);
         };

         $scope.connect = function () {
             midiHandlerService.connectDevice($scope.activeDevice,$scope.device);
             $scope.activeDevice = $scope.m.getActive($scope.device);
         };

     },
     templateUrl : 'app/components/midi_handler/view.html'
 }
}]);