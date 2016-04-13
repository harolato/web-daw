/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
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
        access.then(function (access){
            // If successful
            // Scan through all devices and add them to a list
            access.inputs.forEach(function ( i ) {
                devices.push({
                    user : null,
                    midi : i
                });
            });
            service.devices = devices;
        });
    };
    // Callback for midi message
    var onMessage = function (e, user) {
        // Debugging
        service.val1 = e.data[1];
        service.val2 = e.data[2];
        service.val = e.data[0];
        // Key down event
        if ( e.data[0] == 144 ) {
            // Send note signal to device
            user.instrument_instance.play((440 * Math.pow(2, (e.data[1] - 69) / 12)), user._id);
        } else if ( e.data[0] == 128 ) { // Key up event
            user.instrument_instance.stop((440 * Math.pow(2, (e.data[1] - 69) / 12)));
        }
    };
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
                    devices[d].midi.onmidimessage = function (e) {
                        onMessage(e, user);
                    };
                }
            } else console.log("cant find dev");
        }
    };
    // Disconnect internal device from midi device
    var disconnect = function ( device ) {
        var d = findDevice(device, true);
        console.log(devices[d]);
        // Clear callback and user
        devices[d].user = null;
        devices[d].midi.onmidimessage = null;
    };
    // Get midi device current device is using
    var getActiveDevice = function (d) {
        var d = findDevice(d, true);
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
                if ( d.midi.id == device.midi.id  ) {
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