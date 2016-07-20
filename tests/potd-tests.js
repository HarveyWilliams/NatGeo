/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
/// <reference path="../typings/chai/chai.d.ts"/>
/// <reference path="../lib/potd.d.ts"/>

"use-strict";

var fs = require('fs');
var chai = require('chai');
var rmdir = require('rimraf');

var expect = chai.expect;

var natGeo = require('../');

describe('potd', function() {
    it('getDataFromPage() should return an object', function(done) {
        let potd = new natGeo.photoOfTheDay();

        potd.getDataFromPage(function(data) {
            expect(typeof data).to.equal('object')

            done();
        });
    });

    it('getDataFromPage(function, "http://photography.nationalgeographic.com/photography/photo-of-the-day/skye-scotland-seal/") should return return an object with correct values', function(done) {
        let potd = new natGeo.photoOfTheDay();

        let expectedData = {
            url: 'http://images.nationalgeographic.com/wpf/media-live/photos/000/952/cache/skye-scotland-seal_95219_990x742.jpg',
            date: new Date('JULY 8, 2016'),
            name: 'The Water\'s Fine',
            credit: 'Photograph by Igor Mohoric Bonca, National Geographic Your Shot',
            description: 'A seal readies itself to dive into the waters near Dunvegan Castle on Scotland’s Isle of Skye. The pinnipeds are abundant along Scotland’s coastline—and can be quite photogenic.'
        };

        potd.getDataFromPage(function(data) {
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
        this.timeout(4000);

        let potd = new natGeo.photoOfTheDay();

        potd.getArchivedPhotoUrls(1, 2016, function(data) {
            expect(data.length).to.equal(31);

            done();
        });
    });

    it('getArchivedPhotoUrls() should return URLs', function(done) {
        this.timeout(4000);

        let potd = new natGeo.photoOfTheDay();

        potd.getArchivedPhotoUrls(1, 2016, function(data) {
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
        let potd = new natGeo.photoOfTheDay();

        let inputData = {
            url: '//photos.site.com/path/to/file.jpg',
            date: 'JANUARY 1, 2001',
            name: 'Title Of The Image',
            credit: 'Credit of the photo',
            description: 'Description of the photo'
        };

        let outputData = potd.getDataFromHtml(`
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

    // Currently, the latest archived photos return in a 6 by 6 grid (36 photos).
    it('getLatestArchivedPhotoUrls() should return an array of length 36', function(done) {
        this.timeout(4000);

        let potd = new natGeo.photoOfTheDay();

        potd.getLatestArchivedPhotoUrls(1, function(data) {
            expect(data.length).to.equal(36);

            done();
        })
    });

    // If the pagination is out of range, no photos are available but the page still renders. I'm gonna assume that there will never be 1,000,000 pages...
    it('getLatestArchivedPhotoUrls(1000000) should return an array of length 0', function(done) {
        this.timeout(4000);

        let potd = new natGeo.photoOfTheDay();

        potd.getLatestArchivedPhotoUrls(1000000, function(data) {
            expect(data.length).to.equal(0);

           done();
        })
    });

    it('getAllArchivedPhotoUrlsSync() should return a large array of strings', function() {
        this.timeout(100000);

        let potd = new natGeo.photoOfTheDay();

        let urls = potd.getAllArchivedPhotoUrlsSync();

        // At the time of writing, there are over 2500 photos.
        expect(urls.length).to.be.above(2500);
    });

    it('getAllArchivedPhotoUrls() should return multiple arrays of strings', function(done) {
        this.timeout(100000);

        let potd = new natGeo.photoOfTheDay();
        let i = 0;

        potd.getAllArchivedPhotoUrls(function(urls, finished) {
            if (finished) {
                expect(i).to.be.above(70);

                done();
            }

            i++;
        }, 200);
    });

    it('getDataByDate() should return data with correct date', function(done) {
        this.timeout(4000);

        let potd = new natGeo.photoOfTheDay();

        potd.getDataByDate('2016/02/07', function(data) {
            expect(data.date.getTime()).to.equal(new Date('FEBRUARY 7, 2016').getTime(  ));

            done();
        });
    });

    it.only('getDataFromPage() should save JSON data to a file', function(done) {
        this.timeout(4000);

        let savePath = process.cwd() + '\\data-temp\\';

        // Delete the temp directory to ensure that no files already exist in it.
        if (fs.existsSync(savePath)) {
            rmdir.sync(savePath);
        }

        fs.mkdirSync(savePath);

        let potd = new natGeo.photoOfTheDay({
            saveDataDirectory: savePath
        });

        potd.getDataFromPage(function(data) {
            let fileNameShouldBe = `${data.date.getDate()}-${data.date.getMonth() + 1}-${data.date.getFullYear()}.json`;

            expect(fs.existsSync(savePath + fileNameShouldBe)).to.equal(true);

            done();

            // Cleanup...
            rmdir.sync(savePath);
        });
    });

    it('getExtension() should get the extension of a file', function() {
        let potd = new natGeo.photoOfTheDay();

        expect(potd.getExtension('test.json')).to.equal('json');
        expect(potd.getExtension('C:\\Path\To\File.png')).to.equal('png');
        expect(potd.getExtension('http://test.com/directory/file.jpg')).to.equal('jpg');
    });

    it('getDataFromPage() should save the retrieved photo to a file', function(done) {
        this.timeout(4000);

        let savePath = process.cwd() + '\\photos-temp\\';

        // Delete the temp directory to ensure that no files already exist in it.
        if (fs.existsSync(savePath)) {
            rmdir.sync(savePath);
        }

        fs.mkdirSync(savePath);

        let potd = new natGeo.photoOfTheDay({
            savePhotoDirectory: savePath
        });

        potd.getDataFromPage(function(data) {
            let fileNameShouldBe = `${data.date.getDate()}-${data.date.getMonth() + 1}-${data.date.getFullYear()}.` + potd.getExtension(data.url);;

            expect(fs.existsSync(savePath + fileNameShouldBe)).to.equal(true);

            done();

            // Cleanup...
            rmdir.sync(savePath);
        });
    });

    it.only('new natGeo.photoOfTheDay() should correctly set config options', function() {
        let potd = new natGeo.photoOfTheDay({
            waitTime: 12345
        });

        expect(potd.config.waitTime).to.equal(12345);

        potd = new natGeo.photoOfTheDay({
            baseUrl: 'http://path.to/website'
        });

        expect(potd.config.baseUrl).to.equal('http://path.to/website');
        expect(potd.config.waitTime).to.equal(100);
        expect(potd.config.savePhotoDirectory).to.equal(null);
        expect(potd.config.saveDataDirectory).to.equal(null);
    });
});
