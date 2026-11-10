#!/usr/bin/env python3
"""Comprueba sintaxis JS y cálculos con JavaScriptCore; no sustituye pruebas de navegador."""
from pathlib import Path
import ctypes as C
import ctypes.util
root = Path(__file__).resolve().parents[1]
lib = C.CDLL(ctypes.util.find_library('javascriptcoregtk-4.1') or '/usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so.0')
ptr = C.c_void_p
lib.JSGlobalContextCreate.argtypes = [ptr];lib.JSGlobalContextCreate.restype = ptr
lib.JSGlobalContextRelease.argtypes = [ptr]
lib.JSStringCreateWithUTF8CString.argtypes = [C.c_char_p];lib.JSStringCreateWithUTF8CString.restype = ptr
lib.JSStringRelease.argtypes = [ptr]
lib.JSCheckScriptSyntax.argtypes = [ptr, ptr, ptr, C.c_int, C.POINTER(ptr)];lib.JSCheckScriptSyntax.restype = C.c_bool
lib.JSEvaluateScript.argtypes = [ptr, ptr, ptr, ptr, C.c_int, C.POINTER(ptr)];lib.JSEvaluateScript.restype = ptr
lib.JSValueToStringCopy.argtypes = [ptr, ptr, C.POINTER(ptr)];lib.JSValueToStringCopy.restype = ptr
lib.JSStringGetMaximumUTF8CStringSize.argtypes = [ptr];lib.JSStringGetMaximumUTF8CStringSize.restype = C.c_size_t
lib.JSStringGetUTF8CString.argtypes = [ptr, C.c_char_p, C.c_size_t];lib.JSStringGetUTF8CString.restype = C.c_size_t
ctx = lib.JSGlobalContextCreate(None)
def message(value):
    text = lib.JSValueToStringCopy(ctx, value, None)
    buf = C.create_string_buffer(lib.JSStringGetMaximumUTF8CStringSize(text))
    lib.JSStringGetUTF8CString(text, buf, len(buf));lib.JSStringRelease(text)
    return buf.value.decode()
try:
    for name in ['app.js', 'login.js']:
        source=lib.JSStringCreateWithUTF8CString((root/'src/main/resources/static'/name).read_bytes())
        error=ptr()
        valid=lib.JSCheckScriptSyntax(ctx,source,None,1,C.byref(error))
        lib.JSStringRelease(source)
        if not valid: raise AssertionError(name+': '+message(error))
        print(name+': sintaxis válida')
    app=(root/'src/main/resources/static/app.js').read_text()
    functions=app[app.index('function cents('):app.index('function updateTotals(')]
    checks="""
    const equal=(a,b)=>{if(a!==b)throw Error(String(a)+' != '+String(b));};
    equal(subtotal('10.25','16.90'),17323n);
    equal(subtotal('1.25','1.69'),211n);
    equal(subtotal('0.01','1.50'),2n);
    equal(subtotal('20','16.90'),33800n);
    equal(subtotal('0.01','0.01'),0n);
    equal(cents('999999999999.99'),99999999999999n);
    for(const value of ['', '-1','0.001','NaN','1e3','1,23','1000000000000'])equal(cents(value),null);
    """
    script=lib.JSStringCreateWithUTF8CString((functions+checks).encode());error=ptr()
    lib.JSEvaluateScript(ctx,script,None,None,1,C.byref(error));lib.JSStringRelease(script)
    if error.value: raise AssertionError(message(error))
    print('13 verificaciones de cálculo y formato del frontend correctas.')
finally:
    lib.JSGlobalContextRelease(ctx)
