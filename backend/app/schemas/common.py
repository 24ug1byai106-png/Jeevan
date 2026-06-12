from enum import Enum


DISCLAIMER = "Emergency guidance only. Seek professional medical help immediately."


class Language(str, Enum):
    english = "English"
    hindi = "Hindi"
    kannada = "Kannada"
    tamil = "Tamil"


class Severity(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"

