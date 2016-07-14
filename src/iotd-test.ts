/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
/// <reference path="../typings/chai/chai.d.ts"/>

var chai: Chai.ChaiStatic = require('chai');
var expect = chai.expect;

var nationalGeographic = require('./iotd');

describe('iotd', function() {
    it('getDataFromPage() should return an object', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        iotd.getDataFromPage(function(data: Object) {
            expect(typeof data).to.equal('object')

            done();
        });
    });

    it('getDataFromPage(function, "http://photography.nationalgeographic.com/photography/photo-of-the-day/skye-scotland-seal/") should return return an object with correct values', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        let expectedData = {
            url: 'http://images.nationalgeographic.com/wpf/media-live/photos/000/952/cache/skye-scotland-seal_95219_990x742.jpg',
            date: new Date('JULY 8, 2016'),
            name: 'The Water\'s Fine',
            credit: 'Photograph by Igor Mohoric Bonca, National Geographic Your Shot',
            description: 'A seal readies itself to dive into the waters near Dunvegan Castle on Scotland’s Isle of Skye. The pinnipeds are abundant along Scotland’s coastline—and can be quite photogenic.'
        };

        iotd.getDataFromPage(function(data: any) {
            expect(data.url).to.equal(expectedData.url);
            expect(data.date.getTime()).to.equal(expectedData.date.getTime());
            expect(data.name).to.equal(expectedData.name);
            expect(data.url).to.equal(expectedData.url);
            expect(data.description).to.equal(expectedData.description);

            done();
        }, "http://photography.nationalgeographic.com/photography/photo-of-the-day/skye-scotland-seal/")
    });

    // 31 days in January.
    it('getArchivedPhotoUrls() should return an array of length 31 for January', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        iotd.getArchivedPhotoUrls(1, 2016, function(data: string[]) {
            expect(data.length).to.equal(31);

            done();
        });
    });

    it('getArchivedPhotoUrls() should return URLs', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        iotd.getArchivedPhotoUrls(1, 2016, function(data: string[]) {
            // http://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
            let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
                '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
                '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
                '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
                '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
                '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

            expect(pattern.test(data[0])).to.equal(true);

            done();
        });
    });

    it('getDataFromHtml() should parse HTML and get correct values', function() {
        let iotd = new nationalGeographic.imageOfTheDay();

        let inputData = {
            url: '//images.site.com/path/to/file.jpg',
            date: 'JANUARY 1, 2001',
            name: 'Title Of The Image',
            credit: 'Credit of the photo',
            description: 'Description of the image'
        };

        let outputData = iotd.getDataFromHtml(`
            <html>
                <head>
                </head>
                <body>
                    <h1>${inputData.name}</h1>
                    <p class="publication_time">${inputData.date}</p>
                    <div class="primary_photo">
                        <img src="${inputData.url}" />
                    </div>
                    <p class="publication_time">${inputData.date}/p>
                    <div id="caption">
                        <p class="credit">${inputData.credit}</p>
                        <p>${inputData.description}</p>
                    </div>
                </body>
            </html>
        `);

        expect(outputData.url).to.equal('http:' + inputData.url);
        expect(outputData.date.getTime()).to.equal(new Date(inputData.date).getTime());
        expect(outputData.name).to.equal(inputData.name);
        expect(outputData.credit).to.equal(inputData.credit);
        expect(outputData.description).to.equal(inputData.description);
    });

    // Currently, the latest archived photos return in a 6 by 6 grid (36 images).
    it('getLatestArchivedPhotoUrls() should return an array of length 36', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        iotd.getLatestArchivedPhotoUrls(1, function(data: string[]) {
            expect(data.length).to.equal(36);

            done();
        })
    });

    // If the pagination is out of range, no images are available but the page still renders. I'm gonna assume that there will never be 1,000,000 pages...
    it('getLatestArchivedPhotoUrls(1000000) should return an array of length 0', function(done) {
        let iotd = new nationalGeographic.imageOfTheDay();

        iotd.getLatestArchivedPhotoUrls(1000000, function(data: string[]) {
            expect(data.length).to.equal(0);

           done();
        })
    });

    /*
    it('getAllArchivedPhotoUrlsSync() should return a large array of strings', function() {
        let iotd = new nationalGeographic.imageOfTheDay();

        let urls = iotd.getAllArchivedPhotoUrlsSync();

        // At the time of writing, there are over 2500 photos.
        expect(urls.length).to.be.above(2500);
    });
    */

    /*
    it('getAllArchivedPhotoUrls() should return multiple arrays of strings', function(done) {
        this.timeout(100000);

        let iotd = new nationalGeographic.imageOfTheDay();
        let i = 0;

        iotd.getAllArchivedPhotoUrls(function(urls: string[], done: boolean) {
            if (done) {
                expect(i).to.be.above(70);

                done();
            }

            i++;
        }, 200);
    });
    */
});
