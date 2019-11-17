/**
 * Created with JetBrains PhpStorm.
 * User: alexeybelozerov
 * Date: 3/21/13
 * Time: 12:38 AM
 * To change this template use File | Settings | File Templates.
 */

var VersionConverter = {

    convert: function(currentDataVersion, targetDataVersion) {
    }

};


var VersionConverter_SimpleVersionUpdater = _.extend(VersionConverter, {

    /**
     * Overriden
     */
    convert: function(currentDataVersion, targetDataVersion) {
        var PerfectPixel = new PerfectPixelModel({ id: 1 });
        PerfectPixel.fetch();
        PerfectPixel.set('version', targetDataVersion);
        PerfectPixel.save();
    }
});