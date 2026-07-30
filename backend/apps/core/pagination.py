from collections import OrderedDict

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """Frontend jadvallari kutadigan meta ma'lumotli sahifalash."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    ("page", self.page.number),
                    ("page_size", self.get_page_size(self.request)),
                    ("total_pages", self.page.paginator.num_pages),
                    ("has_next", self.page.has_next()),
                    ("has_previous", self.page.has_previous()),
                    ("results", data),
                ]
            )
        )


class LargePagination(StandardPagination):
    page_size = 100
    max_page_size = 1000
