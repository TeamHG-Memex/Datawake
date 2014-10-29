"""
Copyright 2014 Sotera Defense Solutions, Inc.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""

import json

import tangelo
from datawaketools import datawake_db as db

import users


@tangelo.restful
def get():
    if users.is_in_session():
        results = db.get_domains()
        results = map(lambda x: {'name': x[0], 'description': x[1]}, results)
        return json.dumps(results)

    return json.dumps([])