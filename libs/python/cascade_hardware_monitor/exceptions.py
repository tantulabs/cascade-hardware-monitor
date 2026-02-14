"""
Cascade Hardware Monitor - Exceptions
"""


class CascadeError(Exception):
    """Base exception for Cascade Hardware Monitor."""
    pass


class ConnectionError(CascadeError):
    """Connection to Cascade API failed."""
    pass


class APIError(CascadeError):
    """API returned an error."""
    
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.status_code = status_code
