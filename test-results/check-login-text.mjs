import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({channel:'msedge'});
try {
const page = await browser.newPage({viewport:{width:1440,height:900}});
const html = fs.readFileSync('login.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'');
let css = ['tokens','base','layout','components','responsive'].map(n=>fs.readFileSync('assets/css/'+n+'.css','utf8')).join('\n');
css=css.replace('../images/login-reference.png','data:image/png;base64,'+fs.readFileSync('assets/images/login-reference.png').toString('base64'));
await page.setContent(html);
await page.addStyleTag({content:css});
await page.screenshot({path:'test-results/login-text.png'});
const box = await page.locator('.login-art-copy').boundingBox();
if (!box || Math.abs(box.y+box.height-900)>1) throw Error('Bottom alignment failed');
await page.setViewportSize({width:390,height:844});
if(await page.locator('.login-art').isVisible()) throw Error('Mobile visibility failed');
console.log('Desktop bottom alignment and mobile visibility passed');
} finally {await browser.close();}

