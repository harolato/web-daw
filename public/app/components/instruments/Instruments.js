angular.module('Instruments',['simpleSynth', 'anotherSynth']).

controller('InstrumentsController', ['InstrumentsService', 'utilitiesService', function (InstrumentsService, utilitiesService) {
    var vm = this;
    vm.instruments = InstrumentsService;
    //console.log(vm.instruments);
    vm.crack = 1;
}]).
service('InstrumentsService',['simpleSynth', 'anotherSynth','utilitiesService', function(simpleSynth, anotherSynth, utilitiesService){
    this.availableInstruments = {
        "simple synthesizer" : simpleSynth,
        "Another synthesizer" : anotherSynth
    };
    this.getInstrument = function ( name, device ) {
        var id = utilitiesService.uniqueId();
        return this.availableInstruments[name].getInstance( id, device );
    };
}]);