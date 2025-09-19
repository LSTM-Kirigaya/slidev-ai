import * as svgCaptcha from 'svg-captcha';
async function main() {
    const captcha = svgCaptcha.create({
        size: 4,
        ignoreChars: '0o1i',
        noise: 2,
        color: true,
        background: '#f0f0f0',
    });

    console.log(captcha.text);
    
    console.log(captcha.data);
    
    return {
        svg: captcha.data,
    };
}

main();