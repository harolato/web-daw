/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
// Initialize application
// Loads modules
angular.module('waw', [ 'Devices', 'Instruments', 'keyboard', 'midiHandler', 'Sequencer']).
    /*
    controller  : mainController
    description : It just sits there and provides $scope to child controllers
 */
controller('mainController',['$scope','schedulerService', function($scope, schedulerService){
    $scope.schedulerParams = schedulerService.params;
    var pad = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    $scope.$watch("schedulerParams.currentTime", function(n){
        $scope.currentTime = pad(String(Math.round(n/60)),2) + ":" + pad(String(n).split(".")[0],2) + ":" + pad(String(Math.round(n*1000%1000)),3);
    });
}])
/*
    factory : audioCtx
    desc    : Creates global audio context which is responsible
              of node creation and audio processing
    return  : AudioContext interface
 */
.factory('audioCtx', function () {
    // Initialize variable
    var ctx = null;
    // Assign context depending browser compatibility
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    // create new instance of context
    ctx = new AudioContext();
    // Assign a name for debugging
    ctx.name = "Main audio ctx";
    // return context for further use
    return ctx;
})
/*
    factory : masterGain
    desc    : All child nodes are being linked to this gain node for
              future audio filtering, compression etc.
    return  : GainNode interface
 */
.factory('masterGain', function(audioCtx){
    // create new Node
    var mGain = audioCtx.createGain();
    // set initial gain(volume) value
    // range [0,1]
    mGain.gain.value = 1;
    // Connect created node to speakers
    mGain.connect(audioCtx.destination);
    // return node
    return mGain;
})


.service('tunaEffectsService', ['audioCtx',function (audioCtx) {
    this.tuna = new Tuna(audioCtx);
}])
    /*
    service : utilitiesService
    desc    : Miscellaneous utility functions for example
              unique id generator
    return  : object of functions defined inside service
     */
.service('utilitiesService', function() {
    /*
        UniqueId
        Generates random string of digits and letters
     */
    this.uniqueId = function () {
        var idstr = String.fromCharCode( Math.floor( ( Math.random() * 25 ) + 65 ) );
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode = Math.floor( ( Math.random() * 42 ) + 48 );
            if (ascicode<58 || ascicode>64){
                // exclude all chars between : (58) and @ (64)
                idstr+=String.fromCharCode(ascicode);
            }
        } while ( idstr.length < 32 );
        return idstr;
    }
});
