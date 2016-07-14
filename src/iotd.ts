/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/cheerio/cheerio.d.ts"/>
/// <reference path="../typings/request/request.d.ts"/>

// External dependencies
import fs = require('fs');
import cheerio = require('cheerio');
import request = require('request');
var syncRequest = require('sync-request');

namespace nationalGeographic {
	/**
	 * The config that is parsed into the main method.
	 * 
	 * @export
	 * @interface Config
	 */
	interface Config {
		saveFile: boolean;
		baseUrl: string;
		waitTime: number;
	}
	/**
	 * The image data scraped from the HTML page.
	 * 
	 * @export
	 * @interface ImageData
	 */
	interface ImageData {
		/**
		 * URL to the image itself.
		 * 
		 * @type {string}
		 */
		url: string;
		/**
		 * Date the image was posted.
		 * 
		 * @type {Date}
		 */
		date: Date;
		/**
		 * Name of the image.
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
		 * Information about the image itself.
		 * 
		 * @type {string}
		 */
		description: string;
	}
	export class imageOfTheDay {
		/**
		 * Default constructor.
		 * 
		 * @type {Config} Configure the istance of the image scraper.
		 */
		constructor(public config?: Config) {
			if (config == null) { config = { baseUrl: null, saveFile: null, waitTime: null }; }

			this.config = {
				baseUrl: config.baseUrl == null ? 'http://photography.nationalgeographic.com' : config.baseUrl,
				saveFile: config.saveFile == null ? false : config.saveFile,
				waitTime: config.waitTime == null ? 100 : config.waitTime
			};
		}
		/**
		 * Get data for images from the archive.
		 * 
		 * @param {number} month The month to get the archived images for (ranging from 1 to 12).
		 * @param {number} year The year to get the archived photos for.
		 * @param {Function} [callback] Callback that should be run once the data has been retrieved.
		 */
		public getArchivedPhotosData(month: number, year: number, callback: Function): void {
			var _this = this;

			this.getArchivedPhotoUrls(month, year, function (photoPageUrls: string[]) {
				var imageData: ImageData[] = [];

				for (var i = 0; i < photoPageUrls.length; i++) {
					_this.getDataFromPage(function (data: ImageData) {
						imageData.push(data);
					}, photoPageUrls[i]);
				}

				callback(imageData);

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
		 * Get URLs for the image of the day fron the archive, sorted by latest released first.
		 * This method is not recommended as the web page may take a long time to respond.
		 * 
		 * @param {number} page The current page to look at, page 1 holding the most recent photos.
		 */
		public getLatestArchivedPhotoUrlsSync(page: number): string[] {
			let url = this.config.baseUrl + `/photography/photo-of-the-day/archive/?page=${page}&month=None`;

			return this.getArchivedPhotosFromHtml(syncRequest('GET', url).getBody());
		}
		/**
		 * Get URLs for the image of the day fron the archive, sorted by latest released first.
		 * 
		 * @param {number} page The current page to look at, page 1 holding the most recent photos.
		 * @param {Function} [callback] Callback that should be run once the URLs for the image pages have been retrieved.
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
		 * Get URLs for the image of the day from the archive, sorted by latest first in a given month and year.
		 * 
		 * @param {number} month The month to get the archived images for (ranging from 1 to 12).
		 * @param {number} year The year to get the archived images for.
		 * @param {Function} [callback] Callback that should be run once the URLs for the image pages have been retrieved.
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
		* Loads image information from a National Geographic page.
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

				let background = _this.getDataFromHtml(html);

				callback(background);
			});
		}
		/**
		 * Loads image information from a National Geographic page synchronously.
		 * 
		 * @param {string} [url=this.config.baseUrl + 'photography/photo-of-the-dat/'] Set the URL which should be scraped.
		 * @returns {ImageData}
		 */
		public getDataFromPageSync(url: string = this.config.baseUrl + 'photography/photo-of-the-dat/'): ImageData {
			return this.getDataFromHtml((syncRequest('GET', url).getBody()));
		}
		/**
		 * Load data about an image from an HTML document.
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
		 * Load a list of URLs from an HTML document. HTML page should be a page containg archived images.
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
		public getDataFromHtml(html: string): ImageData {
			let $ = cheerio.load(html);

			let imageData: ImageData = {
				url: 'http:' + $('.primary_photo img').attr('src'),
				date: new Date($('.publication_time').eq(0).text()),
				name: $('h1').text(),
				credit: $('#caption .credit').text(),
				description: $('#caption .credit').next().text()
			};
			
			return imageData;
		}
		/**
		 * Retrieve an image from a URL and saves it to a place on the file system.
		 * 
		 * @param  {string} url URL to the target image.
		 * @param  {string} filePath File path complete with file name (and file type) for where the retrieved file should be placed.
		 * @param  {Function} callback Callback that should be called after the file has been successfully saved.
		 */
		public saveImage(url: string, filePath: string, callback: Function) {
			request(url).pipe(fs.createWriteStream(filePath)).on('close', callback);
		}
	}
}

module.exports = nationalGeographic;