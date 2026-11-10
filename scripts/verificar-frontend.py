#!/usr/bin/env python3
"""Comprueba sintaxis, separación MVVM y pruebas de modelos/ViewModels con JavaScriptCore."""
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
def evaluate(source, label):
    script = lib.JSStringCreateWithUTF8CString(source.encode())
    error = ptr()
    result = lib.JSEvaluateScript(ctx, script, None, None, 1, C.byref(error))
    lib.JSStringRelease(script)
    if error.value: raise AssertionError(label + ': ' + message(error))
    return result
try:
    import re, json
    static = root / 'src/main/resources/static'
    files = sorted((static / 'js').rglob('*.js')) + [root / 'scripts/tests/frontend-mvvm.spec.js', root / 'scripts/test-frontend.cjs']
    for file in files:
        source = lib.JSStringCreateWithUTF8CString(file.read_bytes())
        error = ptr()
        valid = lib.JSCheckScriptSyntax(ctx, source, None, 1, C.byref(error))
        lib.JSStringRelease(source)
        if not valid: raise AssertionError(str(file) + ': ' + message(error))
    print(str(len(files)) + ' archivos JavaScript: sintaxis válida.')
    for folder in ['models', 'viewmodels']:
        for file in (static / 'js' / folder).glob('*.js'):
            assert not re.search(r'\b(document|window|location|innerHTML)\b', file.read_text()), file
    for file in (static / 'js/views').glob('*.js'):
        assert not re.search(r'\bfetch\s*\(', file.read_text()), file
    for html in static.glob('*.html'):
        for file in re.findall(r'(?:src|href)="/([^"#]+)"', html.read_text()):
            assert (static / file).is_file(), (html, file)
    html = (static / 'index.html').read_text()
    ids = set(re.findall(r'id="([^"]+)"', html))
    view = (static / 'js/views/atencion-view.js').read_text()
    selectors = set(re.findall(r"\$\('#([A-Za-z0-9-]+)'\)", view))
    assert not selectors - ids, selectors - ids
    print('Separación MVVM, selectores y referencias de assets: correctas.')
    load_order = ['core/observable-view-model.js', 'core/api-client.js', 'models/session-model.js',
        'models/vale-model.js', 'viewmodels/login-view-model.js', 'viewmodels/atencion-view-model.js', 'views/formatters.js']
    for name in load_order:
        evaluate((static / 'js' / name).read_text(), name)
    evaluate((root / 'scripts/tests/frontend-mvvm.spec.js').read_text(), 'tests')
    evaluate("globalThis.testResult = null; runFrontendTests().then(results => { globalThis.testResult = { ok: true, results }; }, error => { globalThis.testResult = { ok: false, error: error.message }; });", 'suite')
    for _ in range(100):
        result = json.loads(message(evaluate('JSON.stringify(globalThis.testResult)', 'resultado')))
        if result is not None: break
    assert result is not None, 'La suite no terminó.'
    assert result['ok'], result.get('error')
    for name in result['results']: print('OK ' + name)
    print(str(len(result['results'])) + ' pruebas MVVM correctas.')
finally:
    lib.JSGlobalContextRelease(ctx)
