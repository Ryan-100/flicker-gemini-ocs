from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        custom_data = {
            'error': True,
            'message': 'An error occurred.',
            'details': response.data
        }

        # User-friendly mapping for common errors
        if response.status_code == 404:
            custom_data['message'] = "The requested resource was not found."
        elif response.status_code == 403:
            custom_data['message'] = "You do not have permission to perform this action."
        elif response.status_code == 400:
            custom_data['message'] = "There was a problem with your request. Please check your input."
        elif response.status_code == 422: # Common for validation in some setups
            custom_data['message'] = "Validation failed."
        
        # If it's a validation error (often 400 in DRF), we can drill down
        if isinstance(response.data, dict):
            # Try to find a more specific message if available in the details
            first_key = next(iter(response.data))
            if isinstance(response.data[first_key], list) and len(response.data[first_key]) > 0:
                custom_data['message'] = f"Issue with {first_key}: {response.data[first_key][0]}"

        response.data = custom_data

    return response
