Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' Run Flask app silently in background (0 = hidden window)
WshShell.Run "cmd /c cd /d """ & strPath & """ && python app.py", 0, False

' Wait 2 seconds for Flask to start
WScript.Sleep 2000

' Open default browser to app URL
WshShell.Run "http://127.0.0.1:5000/"
