import ctypes
from ctypes import wintypes
import sys

# Constants
MONITOR_DEFAULTTOPRIMARY = 1
MDT_EFFECTIVE_DPI = 0

# Load DLLs
shcore = ctypes.WinDLL("Shcore.dll")
user32 = ctypes.WinDLL("User32.dll")

# ✅ Enable DPI awareness
try:
    shcore.SetProcessDpiAwareness(2)  # Per-monitor DPI aware
except Exception:
    try:
        user32.SetProcessDPIAware()  # Fallback for older Windows
    except:
        pass

# Function prototypes
MonitorFromPoint = user32.MonitorFromPoint
MonitorFromPoint.restype = wintypes.HMONITOR
MonitorFromPoint.argtypes = [wintypes.POINT, wintypes.DWORD]

GetDpiForMonitor = shcore.GetDpiForMonitor
GetDpiForMonitor.argtypes = [wintypes.HMONITOR, ctypes.c_int,
                             ctypes.POINTER(ctypes.c_uint),
                             ctypes.POINTER(ctypes.c_uint)]

def get_system_dpi():
    pt = wintypes.POINT(0, 0)  # Upper-left corner
    monitor = MonitorFromPoint(pt, MONITOR_DEFAULTTOPRIMARY)

    dpi_x = ctypes.c_uint()
    dpi_y = ctypes.c_uint()

    result = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI,
                              ctypes.byref(dpi_x), ctypes.byref(dpi_y))
    if result != 0:
        print("Error: Unable to get DPI for monitor")
        sys.exit(1)

    return dpi_x.value, dpi_y.value

if __name__ == "__main__":
    dpi_x, dpi_y = get_system_dpi()
    dpr = dpi_x / 96  # Default Windows: 96 DPI = 100%
    # print(f"✅ DPI X: {dpi_x}, DPI Y: {dpi_y}")
    print(f"{dpr}")
