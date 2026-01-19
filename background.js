// background.js

const API_KEY = "AIzaSyD13Z5_1234567890ALD89XO";
const DEBUG = true;
const DOMAIN_AGE_API = "https://whois-api.fly.dev/api/whois/";

chrome.storage.local.set({ "API_KEY": API_KEY });
chrome.storage.local.set({ "DEBUG": DEBUG });
chrome.storage.local.set({ "DOMAIN_AGE_API": DOMAIN_AGE_API });

