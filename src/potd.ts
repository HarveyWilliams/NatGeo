/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/cheerio/cheerio.d.ts"/>
/// <reference path="../typings/request/request.d.ts"/>

// External dependencies
import fs = require('fs');
import cheerio = require('cheerio');
import request = require('request');
var syncRequest = require('sync-request');

export namespace nationalGeographic {
	/**
	 * The config that is parsed into the main method.
	 * 
	 * @export
	 * @interface Config
	 */
	export interface config {
		/**
		 * The base URL end point for the remote server such as 'http://photography.nationalgeographic.com'.
		 * 
		 * @type {string}
		 */
		baseUrl: string;
		/**
		 * If specified, this will be the location where the JSON blobs of photo data should be saved after it has been retrieved.
		 * 
		 * @type {string}
		 */
		saveDataDirectory: string;
		/**
		 * If specified, this will be the location where the photo file should be saved after it has been retrieved.
		 * 
		 * @type {string}
		 */
		savePhotoDirectory: string;
		/**
		 * The wait time before successive calls should be made to the remote server.
		 * 
		 * @type {number}
		 */
		waitTime: number;
	}
	/**
	 * The photo data scraped from the HTML page.
	 * 
	 * @export
	 * @interface ImageData
	 */
	export interface photoData {
		/**
		 * URL to the photo itself.
		 * 
		 * @type {string}
		 */
		url: string;
		/**
		 * Date the photo was posted.
		 * 
		 * @type {Date}
		 */
		date: Date;
		/**
		 * Name of the photo.
		 * 
		 * @type {string}
		 */
		name: string;
		/**
		 * Photographer credit.
		 * 
		 * @type {string}
		 */
		credit: string;
		/**
		 * Information about the photo itself.
		 * 
		 * @type {string}
		 */
		description: string;
	}
	/**
	 * Methods for getting the current photo of hte day and previous photos of the day.
	 * 
	 * @export
	 * @class photoOfTheDay
	 */
	export class photoOfTheDay {
		/**
		 * Default constructor.
		 * 
		 * @type {Config} Configure the instance of the photo scraper.
		 */
		constructor(public config?: config) {
			if (config == null) {
				config = {
					baseUrl: null,
					saveDataDirectory: null,
					savePhotoDirectory:  null,
					waitTime:  100
				};
			}

			this.config = {
				baseUrl: config.baseUrl || 'http://photography.nationalgeographic.com',
				saveDataDirectory: config.saveDataDirectory || null,
				savePhotoDirectory: config.savePhotoDirectory || null,
				waitTime: config.waitTime || 100
			};
		}
		/**
		 * Get a single photos data by the date the photo was published.
		 * If you are building a local archive of all of the photos, this method might not be for you! It makes two calls to National Geographic for every photo scraped. Use 'getAllArchivedPhotoData()' instead.
		 * 
		 * @param {string} dateAsString A date that can be parsed by the new Date() function.
		 * @param {Function} callback Callback that should be run once the data has been retrieved.
		 * @returns {void}
		 */
		public getDataByDate(dateAsString: string, callback: Function): void {
			let _this = this;

			let date = new Date(dateAsString);
			let daysInMonth = new Date(date.getFullYear(), date.getMonth(), 0).getDate();

			this.getArchivedPhotoUrls(date.getMonth() + 1, date.getFullYear(), function(urls : string) {
				let url = urls[daysInMonth - date.getDate() - 2];

				_this.getDataFromPage(function(data: photoData) {
					callback(data);
				}, url);
			});

			return;
		}
		/**
		 * Get data for photos from the archive.
		 * 
		 * @param {number} month The month to get the archived photos for (ranging from 1 to 12).
		 * @param {number} year The full year (such as 2016) to get the archived photos for.
		 * @param {Function} [callback] Callback that should be run once the data has been retrieved.
		 */
		public getArchivedPhotosData(month: number, year: number, callback: Function): void {
			let _this = this;

			this.getArchivedPhotoUrls(month, year, function (photoPageUrls: string[]) {
				let photoData: photoData[] = [];

				for (var i = 0; i < photoPageUrls.length; i++) {
					_this.getDataFromPage(function (data: photoData) {
						photoData.push(data);
					}, photoPageUrls[i]);
				}

				callback(photoData);

				return;
			});
		}
		/**
		 * Get all photos as data.
		 * 
		 * @param {Function} callback The function that is run after each pages data is retrieved.
		 * @param {number} [waitTime=this.config.waitTime] In order to stop the server from being hit too hard, this number tells the method how long to wait before making a new call.
		 */
		public getAllArchivedPhotoData(callback: Function, waitTime: number = this.config.waitTime): void {
			let _this = this;

			this.getAllArchivedPhotoUrls(function(urls: string[], done: boolean) {
				if (done) {
					return;
				}

				for (let url of urls) {
					callback(_this.getDataFromPageSync(url));
				}
			}, waitTime);
		}
		/**
		 * Get all photos.
		 * 
		 * @param {Function} callback The method that is run after one chunk of URLs have been retrieved.
		 * @param {number} [waitTime=this.config.waitTime] In order to stop the server from being hit too hard, this number tells the method how long to wait before making a new call.
		 * @returns {void}
		 */
		public getAllArchivedPhotoUrls(callback: Function, waitTime: number = this.config.waitTime): void {
			let _this = this;
			let i = 1;

			let timeout = function() {
				setTimeout(function() {
					let tempI = i;
					let urls = _this.getLatestArchivedPhotoUrlsSync(tempI);

					callback(urls, urls.length == 0);

					if (urls.length == 0) {
						return true;
					}

					i++;

					return timeout();
				}, waitTime);
			};

			if(timeout()) {
				return;
			}
		}
		/**
		 * Get all photos.
		 * Warning: this function may take a long time to complete as it requests each page after the other. IT COULD EVEN DDOS the site.
		 * Best to cache the results from this...
		 * 
		 * @returns {string[]}
		 */
		public getAllArchivedPhotoUrlsSync(): string[] {
			let allUrls: string[] = [];

			for (let i = 1; i; i++) {
				let urls = this.getLatestArchivedPhotoUrlsSync(i);

				if (urls.length == 0) {
					break;
				}

				allUrls = allUrls.concat(urls);
			}

			return allUrls;
		}
		/**
		 * Get URLs for the photo of the day fron the archive, sorted by latest released first.
		 * This method is not recommended as the web page may take a long time to respond.
		 * 
		 * @param {number} page The current page to look at, page 1 holding the most recent photos.
		 */
		public getLatestArchivedPhotoUrlsSync(page: number): string[] {
			let url = this.config.baseUrl + `/photography/photo-of-the-day/archive/?page=${page}&month=None`;

			return this.getArchivedPhotosFromHtml(syncRequest('GET', url).getBody());
		}
		/**
		 * Get URLs for the photo of the day fron the archive, sorted by latest released first.
		 * 
		 * @param {number} page The current page to look at, page 1 holding the most recent photos.
		 * @param {Function} [callback] Callback that should be run once the URLs for the photo pages have been retrieved.
		 */
		public getLatestArchivedPhotoUrls(page: number, callback: Function) {
			let _this = this;
			let url = this.config.baseUrl + `/photography/photo-of-the-day/archive/?page=${page}&month=None`;

			request({
				method: 'GET',
				url: url
			}, function (err, response, html) {
				if (err) {
					console.log('[backgrounds]', err);

					return;
				}

				let photoUrls = _this.getArchivedPhotosFromHtml(html);

				callback(photoUrls);

				return;
			})
		}
		/**
		 * Get URLs for the photo of the day from the archive, sorted by latest first in a given month and year.
		 * 
		 * @param {number} month The month to get the archived photos for (ranging from 1 to 12).
		 * @param {number} year The full year (such as 2016) to get the archived photos for.
		 * @param {Function} [callback] Callback that should be run once the URLs for the photo pages have been retrieved.
		 */
		public getArchivedPhotoUrls(month: number, year: number, callback: Function) {
			let _this = this;
			let url = this.config.baseUrl + `/photography/photo-of-the-day/archive/?month=${month}&year=${year}`;

			request({
				method: 'GET',
				url: url
			}, function (err, response, html) {
				if (err) {
					console.log('[backgrounds]', err);

					return;
				}

				let photoPages = _this.getArchivedPhotosFromHtml(html);

				callback(photoPages);

				return;
			});
		}
		/**
		* Loads photo information from a National Geographic page.
		* 
		* @param {Function} [callback] A function that is ran when the page is successfully scraped. The scrape data will be put into the callback.
		* @param {string} [url='http://photography.nationalgeographic.com/photography/photo-of-the-day/'] Set the URL which should be scraped.
		*/
		public getDataFromPage(callback: Function, url: string = this.config.baseUrl + '/photography/photo-of-the-day/') {
			let _this = this;

			request({
				method: 'GET',
				url: url
			}, function (err, response, html) {
				if (err) {
					console.log('[backgrounds]', err);

					return;
				}

				let data = _this.getDataFromHtml(html);
				let extension = data.url.split('.')[data.url.split('.').length - 1] ;

				if (_this.config.savePhotoDirectory != null) {
					_this.savePhoto(data.url, _this.config.savePhotoDirectory, `${data.date.getDate()}-${data.date.getMonth() + 1}-${data.date.getFullYear()}.${extension}`);
				}

				if (_this.config.saveDataDirectory != null) {
					_this.saveData(data, _this.config.saveDataDirectory, `${data.date.getDate()}-${data.date.getMonth() + 1}-${data.date.getFullYear()}.json`);
				}

				callback(data);
			});
		}
		/**
		 * Loads photo information from a National Geographic page synchronously.
		 * 
		 * @param {string} [url=this.config.baseUrl + 'photography/photo-of-the-dat/'] Set the URL which should be scraped.
		 * @returns {ImageData}
		 */
		public getDataFromPageSync(url: string = this.config.baseUrl + 'photography/photo-of-the-dat/'): photoData {
			return this.getDataFromHtml((syncRequest('GET', url).getBody()));
		}
		/**
		 * Load data about an photo from an HTML document.
		 * 
		 * @param {string} filePath File system file path to the target HTML file (including file name and file type).
		 * @param {Function} callback This callback is run when the data is successfully retrieved.
		 */
		public getDataFromFile(filePath: string, callback: Function) {
			var _this = this;

			fs.readFile(filePath, 'utf-8', function (err, html) {
				if (err) {
					console.log('[backgrounds]', err);

					return;
				}

				callback(_this.getDataFromHtml(html));
			});
		}
		/**
		 * Load a list of URLs from an HTML document. HTML page should be a page containg archived photos.
		 * 
		 * @param {string} html The HTML that should be parsed.
		 * @returns {string[]}
		 */
		public getArchivedPhotosFromHtml(html: string): string[] {
			let $ = cheerio.load(html);
			let pages: string[] = [];
			let links = $('#search_results > div > a');

			for (var i = 0; i < links.length; i++) {
				pages.push(this.config.baseUrl + links.eq(i).attr('href'));
			}

			return pages;
		}
		/**
		 * Loads data from an HTML string.
		 * 
		 * @param {string} html The HTML that should be parsed.
		 * @returns {Background}
		 */
		public getDataFromHtml(html: string): photoData {
			let $ = cheerio.load(html);

			let photoData: photoData = {
				url: 'http:' + $('.primary_photo img').attr('src'),
				date: new Date($('.publication_time').eq(0).text()),
				name: $('h1').text(),
				credit: $('#caption .credit').text(),
				description: $('#caption .credit').next().text()
			};
			
			return photoData;
		}
		/**
		 * Retrieve an photo from a URL and saves it to a place on the file system.
		 * 
		 * @param  {string} url URL to the target photo.
		 * @param  {string} filePath File path for where the retrieved file should be placed.
		 * @param  {string} fileName File name complete with extension that the file should be named.
		 * @param  {Function} [callback] Callback that should be called after the file has been successfully saved.
		 */
		public savePhoto(url: string, filePath: string, fileName: string, callback?: Function): void {
			callback = callback || function() {};

			request(url).pipe(fs.createWriteStream(filePath + fileName)).on('close', callback);
		}
		/**
		 * Save an object to a file.
		 * 
		 * @param {photoData} data The data that should be saved to the file.
		 * @param {string} filePath The directory where the file should be saved to.
		 * @param {string} fileName The name of the file complete with extension that the file should be named.
		 * @param {Function} [callback] Callback that should be called after the file has been saved.
		 */
		public saveData(data: photoData, filePath: string, fileName: string, callback?: Function): void {
			callback = callback || function() {};

			fs.writeFile(filePath + fileName, JSON.stringify(data, null, 4), function(err) {
				if (err) {
					console.log('[backgrounds] Error saving JSON data to file.');
				}

				callback();
			});
		}
	}
}

module.exports = nationalGeographic;