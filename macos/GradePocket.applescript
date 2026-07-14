on run
    set launcherPath to "__LAUNCHER_PATH__"
    try
        do shell script quoted form of launcherPath
    on error errorMessage
        display dialog errorMessage with title "成绩袋启动失败" buttons {"好"} default button "好" with icon stop
    end try
end run
