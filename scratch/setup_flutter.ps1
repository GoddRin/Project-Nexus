$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*C:\src\flutter\bin*") {
    [Environment]::SetEnvironmentVariable("Path", $userPath + ";C:\src\flutter\bin", "User")
}
C:\src\flutter\bin\flutter doctor
