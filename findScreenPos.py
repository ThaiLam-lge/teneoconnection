"""
Python program to find the position of an image on the screen
Input: python3 findScreenPos.py <imagePath>
Output: Prints the result to the console in the format:
<found y/n>;<xPosition>;<yPosition>;<imageWidth>;<imageHeight>
The position values are rounded to integers. If the image is not found, all values are set to 0.
"""
import cv2  # OpenCV for image processing
import sys  # For command-line arguments
import numpy as np  # For handling image arrays (if needed)
import pyautogui
from screeninfo import get_monitors

def find_screen_position(image_path):
    try:
        template = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        if template is None:
            print("n;0;0;0;0")
            return

        screen = pyautogui.screenshot()
        screen = cv2.cvtColor(np.array(screen), cv2.COLOR_RGB2BGR)
        screen = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)

        # cv2.imshow("template",template)
        # cv2.waitKey(0)
        # cv2.imshow("Screen",screen)
        # cv2.waitKey(0)
        

        result = cv2.matchTemplate(screen, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)


        threshold = 0.8
        if max_val >= threshold:
            x, y = max_loc
            h, w = template.shape[:2]
            print(f"y;{int(x)};{int(y)};{int(w)};{int(h)}")
        else:
            print("no;0;0;0;0")
    except Exception as e:
        # print(e)
        print("n;0;0;0;0")


if __name__ == "__main__":
    # Check if the correct number of arguments is provided
    if len(sys.argv) != 2:
        print("Usage: python3 findScreenPos.py <imagePath>")
    else:
        # Call the function with the provided image path
        find_screen_position(sys.argv[1])