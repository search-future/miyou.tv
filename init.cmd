if "%PROCESSOR_ARCHITECTURE%" equ "x86" set ARCH=ia32
if "%PROCESSOR_ARCHITECTURE%" equ "AMD64" set ARCH=x64
npm install --wcjs_runtime="electron" --wcjs_runtime_version="1.8.7" --wcjs_arch="%ARCH%"
node download.js
