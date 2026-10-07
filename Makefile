SHELL           := /bin/bash

### ---------------------------------------------------
### Make Documentation (mkdocs)
### ---------------------------------------------------
HOST		:=
PORT		:=
localport	 = $(shell echo $$(( 1000 + ($$RANDOM % 9000) )))

ADDR		:= $(and $(or $(HOST),$(PORT)),		\
  $(or $(HOST),localhost):$(or $(PORT),$(localport))	\
)
ADDR_SWITCH	:= $(and $(ADDR),-a $(ADDR))

docserve :
	mkdocs serve $(ADDR_SWITCH) --livereload

docbuild :
	mkdocs build

docs : docserve
### ---------------------------------------------------
