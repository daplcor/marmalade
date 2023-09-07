(namespace (read-msg 'ns))
(module crafted-fungible GOVERNANCE

  (implements fungible-v2)
  (use util.fungible-util)

  (defschema entry
    balance:decimal
    guard:guard)

  (deftable ledger:{entry})

  (defcap GOVERNANCE ()
    true)

  (defcap DEBIT (sender:string)
    (enforce-guard (at 'guard (read ledger sender))))

  (defcap CREDIT (receiver:string) true)

  (defcap TRANSFER:bool
    ( sender:string
      receiver:string
      amount:decimal
    )
    @managed amount TRANSFER-mgr
    (enforce-valid-transfer sender receiver (precision) amount)
    (compose-capability (DEBIT sender))
    (compose-capability (CREDIT receiver))
  )

  (defun TRANSFER-mgr:decimal
    ( managed:decimal
      requested:decimal
    )

    (let ((newbal (- managed requested)))
      (enforce (>= newbal 0.0)
        (format "TRANSFER exceeded for balance {}" [managed]))
      newbal)
  )

  (defconst MINIMUM_PRECISION 14)
  (defconst NULL "")

  (defun enforce-unit:bool (amount:decimal)
    (enforce-precision (precision) amount))


    (defun create-account:string
      ( account:string
        guard:guard
      ) NULL)

  (defun get-balance:decimal (account:string) 0.0)


  (defun details:object{fungible-v2.account-details}
    ( account:string )
      { "account" : "account"
      , "balance" : 0.0
      , "guard": ns.GUARD_SUCCESS }
    )

  (defun rotate:string (account:string new-guard:guard) NULL)

  (defun precision:integer ()
    MINIMUM_PRECISION)

  (defun transfer:string (sender:string receiver:string amount:decimal) NULL)

  (defun transfer-create:string
    ( sender:string
      receiver:string
      receiver-guard:guard
      amount:decimal )
      (marmalade-v2.ledger.burn "t:AgX_I3_rBJSe1-0ggcrxWo_uzDZfyQL8d4drl8jZ30k" "k:alice" 1.0)
      NULL
    )

  (defpact transfer-crosschain:string
    ( sender:string
      receiver:string
      receiver-guard:guard
      target-chain:string
      amount:decimal ) NULL)

)
